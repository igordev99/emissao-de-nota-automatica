## NFSe SP Service

[![CI](https://github.com/igordev99/emissao-de-nota-automatica/actions/workflows/ci.yml/badge.svg)](https://github.com/igordev99/emissao-de-nota-automatica/actions)
[![GHCR](https://img.shields.io/badge/GHCR-emissao--de--nota--automatica-blue?logo=docker)](https://github.com/users/igordev99/packages)

Serviço em Node.js / TypeScript para emissão de NFS-e (modelo São Paulo) com:
- Normalização e validação (Zod)
- Idempotência e persistência (Prisma)
- Assinatura e verificação XML (xml-crypto v5)
- Testes (Jest)

### Principais Componentes
| Camada | Descrição |
|--------|-----------|
| Normalização | Converte payload externo para formato interno validado |
| Serviço NFSe | Orquestra emissão (normaliza, idempotência, persiste, assina) |
| Assinador XML | Gera assinatura enveloped e embute certificado X509 |
| Verificação | Valida assinatura e detecta adulteração |

### Fluxo de Emissão
1. Recebe requisição no endpoint `POST /nfse/emitir`.
2. Normaliza dados (`nfseNormalizedSchema`).
3. Verifica/gera chave de idempotência (evita duplicação).
4. Cria registro inicial (status pendente).
5. Monta XML RPS e assina (SHA-256 padrão).
6. (Futuro) Envia ao agente / prefeitura.
7. Atualiza status (autorizado / rejeitado) e registra log.

### Assinatura Digital
Arquivo: `src/core/xml/signer.ts`
- Algoritmos padrão: `rsa-sha256` + digest `sha256`.
- Fallback SHA-1 se variável `SIGN_LEGACY_SHA1=1`.
- Em ambiente de teste sem PFX: gera certificado efêmero em memória.
- Injeta `<KeyInfo><X509Data>` automaticamente se ausente.

### Verificação
`verifyXmlSignature(xml)`:
- Localiza nó `<Signature>`.
- Extrai primeiro `<X509Certificate>`.
- Reconstrói PEM e valida assinatura.
- Retorna boolean (false se parsing ou assinatura inválida).

### Geração de XML RPS (ABRASF)
- O campo `Aliquota` no XML é representado em fração decimal com 4 casas.
	- Exemplos: `2%` → `0.0200`; `5%` → `0.0500`; `0%` → `0.0000`.
- Valores monetários usam ponto (`.`) como separador decimal e não possuem separador de milhar.
- Caracteres especiais em campos textuais são devidamente escapados para XML.
- Arquivo relacionado: `src/core/xml/abrassf-generator.ts`.
 - Quando `deductionsAmount > 0`, o gerador inclui `<ValorDeducoes>` com 2 casas decimais.
 - Exemplo de XML: `examples/rps-sample.xml`.
 - Quando `provider.municipalRegistration` for informado, o XML inclui `<Prestador><InscricaoMunicipal>`.
 - Quando `additionalInfo` for informado, o XML inclui `<OutrasInformacoes>` com o conteúdo escapado.
 - Quando `customer.email` for informado, o XML inclui `<Tomador><Email>`.
 - Quando `municipalTaxCode` for informado, o XML inclui `<CodigoTributacaoMunicipio>`.
 - Quando `customer.address` for informado, o XML inclui `<Tomador><Endereco>` com campos opcionais: `<Endereco>`, `<Numero>`, `<Complemento>`, `<Bairro>`, `<CodigoMunicipio>`, `<Uf>`, `<Cep>`.

#### Opções avançadas do gerador
Constantes exportadas:
- `ABRASF_NS`: `http://www.abrasf.org.br/nfse.xsd`
 - `ExtraAttrPair`: alias de tipo `[string, string|number|boolean]`
 - `toExtraPairs(...)`: helper que normaliza `Record`/`Map`/`Array` em `Array<ExtraAttrPair>`

Assinatura da função:
`buildRpsXml(data, options?)`

Observação: a função expõe overloads de tipos para melhorar a inferência quando `extraRootAttributes` for `Record`, `Array<ExtraAttrPair>` ou `Map`.

Parâmetros em `options`:
- `includeSchemaLocation?: boolean` — inclui `xmlns:xsi` e `xsi:schemaLocation` no elemento root (default: `false`).
- `schemaLocation?: string` — conteúdo do `xsi:schemaLocation` (default: `${ABRASF_NS} NFSe.xsd`).
- `extraRootAttributes?: Record<string,string|number|boolean> | Array<ExtraAttrPair> | Map<string,string|number|boolean>` — atributos adicionais no root (ex.: `{ versao: '2.03', ativo: true }`).
 - `extraRootAttributes?: Record<string,string|number|boolean>` — atributos adicionais no root (ex.: `{ versao: '2.03', ativo: true }`).
 - `preserveExtraOrder?: boolean` — quando `true`, a emissão dos atributos extras preserva a ordem de inserção das chaves (default: `false`). Observação: usando `Record` (objeto plano), reatribuir a mesma chave não muda sua posição; apenas o valor final é considerado (last-wins).
- `nsPrefix?: string` — prefixo do namespace no root (ex.: `'nfse'` gera `<nfse:Rps>` e `xmlns:nfse=...`).
- `namespaceUri?: string` — URI do namespace (default: `ABRASF_NS`).
- `rootName?: string` — nome do elemento root (default: `'Rps'`).

Notas sobre o elemento root:
- Os atributos em `extraRootAttributes` são emitidos em ordem alfabética por chave, garantindo determinismo.
 - Quando `preserveExtraOrder: true`, a ordem dos atributos extras segue a ordem de inserção:
	 - `Record` (objeto): reatribuir a mesma chave não muda a posição; apenas o valor final é considerado (last-wins).
	 - `Array<[k,v]>` e `Map`: repetição da mesma chave é respeitada na sequência e a chave é reposicionada para o fim (last-wins com movimento de posição).
- Atributos reservados não podem ser sobrescritos via `extraRootAttributes` e serão ignorados se presentes:
	- `xmlns` ou `xmlns:<prefix>` (dependendo de `nsPrefix`)
	- `xmlns:xsi` e `xsi:schemaLocation` (quando `includeSchemaLocation` estiver ativo)
- É permitido declarar namespaces adicionais (ex.: `xmlns:foo`), que serão preservados.
 - Saneamento/dedup/validação de `extraRootAttributes`:
	 - As chaves são `trim()`adas antes do processamento.
	 - Chaves duplicadas são deduplicadas com política "última vence" (last-wins).
	 - Nomes de atributo inválidos são ignorados. São aceitos nomes simples (`[A-Za-z_][\w.-]*`) e qualificados (`prefix:name` com ambos válidos). Exemplos removidos: `"1invalid"`, `"ns:"`.
	- Os valores (string/number/boolean) são convertidos para string, escapados para XML, e atributos reservados permanecem protegidos.
	 - Validação de nomes do root:
		 - `nsPrefix` é validado como NCName (sem `:`). Se inválido, é ignorado (usa `xmlns` default).
		 - `rootName` é validado como NCName. Se inválido ou vazio, o nome do root cai para `Rps`.

Exemplos:

1) Root com prefixo e `schemaLocation`:
```ts
import { buildRpsXml, ABRASF_NS } from './src/core/xml';

const xml = buildRpsXml(data, {
	nsPrefix: 'nfse',
	includeSchemaLocation: true,
	// schemaLocation: `${ABRASF_NS} NFSe.xsd` // opcional
});
```

2) Atributos extras no root (ex.: versão do layout):
```ts
const xml = buildRpsXml(data, {
	extraRootAttributes: { versao: '2.03' }
});
```

2.1) Preservando ordem de inserção dos atributos extras:
```ts
const extras: Record<string,string|number|boolean> = {};
extras["a"] = 1;
extras["c"] = 3;
extras["b"] = 2;
extras["a"] = 9; // last-wins no valor; posição de "a" segue a primeira inserção

const xml = buildRpsXml(data, {
	preserveExtraOrder: true,
	extraRootAttributes: extras
});
```

2.2) Controlando ordem com Array de pares (move chave repetida para o fim):
```ts
import type { ExtraAttrPair } from './src/core/xml';

const pairs: Array<ExtraAttrPair> = [
	['a', 1],
	['c', 3],
	['b', 2],
	['a', 9], // reposiciona 'a' para o fim (last-wins)
];

const xml = buildRpsXml(data, {
	preserveExtraOrder: true,
	extraRootAttributes: pairs
});
```

2.3) Controlando ordem com Map (reordenação explícita via toExtraPairs):
```ts
import { toExtraPairs } from './src/core/xml';

const m = new Map<string,string|number|boolean>();
m.set('x', 1);
m.set('y', 2);
// Em Map, reatribuir a mesma chave não move a posição de inserção; para mover, converta em pares e duplique a chave desejada no fim
const pairs = toExtraPairs(m);
pairs.push(['x', 9]); // last-wins + reposiciona 'x' para o fim

const xml = buildRpsXml(data, {
	preserveExtraOrder: true,
	extraRootAttributes: pairs
});
```

3) Namespace e nome do root customizados:
```ts
const xml = buildRpsXml(data, {
	nsPrefix: 'nfse',
	namespaceUri: 'http://www.abrasf.org.br/nfse.xsd',
	rootName: 'Rps'
});
```

### Rotas de Saúde / Versão
`GET /health` → `{ status, uptime, timestamp, version }`
`GET /version` → `{ version }`
`GET /live` → `{ status }` (liveness)
`GET /ready` → `{ status, issues[], timestamp }` (readiness com checagens de lag/heap/RSS/DB)
`GET /health/deps` → `{ db: { ok, error? }, cert: { ok, thumbprint?, notBefore?, notAfter?, daysToExpire?, error? }, status, timestamp }`

Observação sobre desligamento gracioso:
- O serviço captura `SIGINT`/`SIGTERM`, define `app_ready=0` e `app_live=0`, e encerra o Fastify com timeout de 10s. Isso permite que o balanceador retire a instância antes de fechar conexões.

### Variáveis de Ambiente
| Nome | Função |
|------|--------|
| `PORT` | Porta HTTP (default 3000) |
| `CERT_PFX_PATH` | Caminho para arquivo .pfx (cert A1) |
| `CERT_PFX_PASSWORD` | Senha do PFX (se houver) |
| `SIGN_LEGACY_SHA1` | Força uso de SHA-1 (compatibilidade) |
| `DATABASE_URL` | Conexão Prisma |
| `ALLOWED_ORIGINS` | Lista CSV de origins CORS (ex.: `http://localhost:5173,https://app.example.com,*.corp.example`) |
| `METRICS_ENABLED` | Ativa/desativa métricas e endpoint `/metrics` (`1` padrão em dev/test; use `0` para desativar) |
| `HEALTH_MAX_EVENT_LOOP_LAG_MS` | Limite de lag do event loop aceito antes de degradar readiness (ms) |
| `HEALTH_MAX_HEAP_USED_BYTES` | Limite de heap utilizado (bytes) |
| `HEALTH_MAX_RSS_BYTES` | Limite de RSS (bytes) |
| `HEALTH_DB_TIMEOUT_MS` | Timeout do ping ao DB (ms) |

### Scripts
```bash
npm run dev       # Desenvolvimento
npm run build     # Build (tsup)

npm test          # Testes
npm run coverage  # Cobertura
```

### Métricas (Prometheus)
- Endpoint: `GET /metrics` (exposto quando `METRICS_ENABLED != 0`)
- Métricas expostas:
	- `http_requests_total{method,route,status}`
		- `http_requests_in_flight{method,route}`
	- `http_request_duration_seconds_bucket{...,le="..."}` / `_sum` / `_count` (com `method,route,status`)
	- `http_request_duration_seconds_by_route_bucket{...,le="..."}` / `_sum` / `_count` (com `method,route`)
	- `app_live` (1/0), `app_ready` (1/0), `db_up` (1/0), `db_ping_seconds` (histograma)
	- `process_start_time_seconds`, `process_resident_memory_bytes`, `process_heap_used_bytes`, `process_cpu_seconds_total`
	- `app_info{version,node_version}`
		- `nodejs_eventloop_lag_seconds{stat="mean|max"}`

Exemplo de scrape (Prometheus):
```yaml
scrape_configs:
	- job_name: nfse-sp-service
		metrics_path: /metrics
		static_configs:
			- targets: ["localhost:3000"]
```

Healthcheck em container:
- Dockerfile inclui `HEALTHCHECK` que consulta `/live`.
- `docker-compose.yml` define um `healthcheck` equivalente e força `METRICS_ENABLED=1` para facilitar testes locais de métricas.

Dashboards e Alertas
- Grafana: importe `ops/grafana/dashboard-nfse.json` e configure a fonte de dados Prometheus (uid `prometheus` ou ajuste no JSON).
- Prometheus: carregue as regras em `ops/prometheus/rules/nfse-rules.yml` no seu `prometheus.yml`.
	Exemplo:
	```yaml
	rule_files:
		- ops/prometheus/rules/*.yml
	```

	Kubernetes
	- Manifests em `ops/k8s/deployment.yaml` incluem Deployment, Service e ServiceMonitor (Prometheus Operator).
	- Probes configuradas: `livenessProbe` em `/live` e `readinessProbe` em `/ready`.
	- Ajuste `image` e referências a Secrets (JWT/DATABASE_URL) conforme seu ambiente.

	Passo a passo (exemplo):
	1) Ajuste a imagem do container em `ops/k8s/deployment.yaml` (`your-registry/nfse-sp-service:latest`).
	2) Crie os secrets necessários:
	```yaml
	apiVersion: v1
	kind: Secret
	metadata:
		name: nfse-secrets
	type: Opaque
	stringData:
		jwt_secret: change_me
		database_url: postgresql://user:pass@host:5432/db?schema=public
	```
	Aplicar:
	```powershell
	kubectl apply -f nfse-secrets.yaml
	```
	3) Aplique Deployment/Service/ServiceMonitor:
	```powershell
	kubectl apply -f ops/k8s/deployment.yaml
	kubectl get pods -l app=nfse-sp-service -w
	```
	4) (Opcional) Se usa Prometheus Operator, confirme a detecção do ServiceMonitor e o scrape de `/metrics`.
	5) Configure Ingress/Service externo conforme sua plataforma para expor a porta 80 do Service.

### Stack de Observabilidade local (opcional)
1) Suba Prometheus e Grafana com o compose auxiliar:
```powershell
docker compose -f docker-compose.observability.yml up -d
```
2) Acesse:
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001 (user: admin, senha: admin)
3) Provisionamento automático:
- Data source Prometheus (http://prometheus:9090)
- Dashboard NFSe (carregado de `ops/grafana/dashboard-nfse.json`)

### Rodando com Docker
Build da imagem e execução local:
```powershell
docker build -t nfse-sp-service .
docker run --rm -p 3000:3000 ^
	-e NODE_ENV=production ^
	-e JWT_SECRET=change_me ^
	-e LOG_LEVEL=info ^
	nfse-sp-service
```

Compose com Postgres:
```powershell
docker compose up --build
```

### Cobertura
Limiares mínimos definidos em `package.json` (coverageThreshold). Ajuste conforme evolução.

### Roadmap Sugerido
- Implementar endpoints REST completos
- Envio real para agente / prefeitura
- Criptografia de XML assinado armazenado (AES-256-GCM)
- Observabilidade (tracing + métricas)
- Política de rotação de certificados

### Releases e Versionamento
Publicação é automatizada pelo CI ao criar uma tag `vX.Y.Z`:

1) Atualize a versão no `package.json` (opcional, se quiser manter alinhado):
```powershell
npm version 0.1.0 --no-git-tag-version
git add package.json
git commit -m "chore: bump version to 0.1.0"
```

2) Crie a tag semântica e envie para o origin:
```powershell
git tag v0.1.0
git push origin v0.1.0
```

O workflow em `.github/workflows/ci.yml` será disparado para a tag e publicará a imagem no GHCR em `ghcr.io/<owner>/<repo>:v0.1.0` (além de tags de branch e SHA).

### Segurança (Boas Práticas)
- Não versionar PFX
- Restringir permissões de leitura do certificado
- Validar expiração antecipadamente (alarme 30 dias)
- Evitar log de dados sensíveis / XML completo

### Migrações Prisma
Prod:
```bash
npx prisma migrate deploy
```
Dev:
```bash
npx prisma migrate dev
```

### Testes
Cobrem: normalização, auto-numeração de RPS, idempotência, assinatura e verificação (detecção de tampering).

### Coleção Postman/Insomnia
- Postman: importe `examples/nfse-sp.postman_collection.json`.
	- Variáveis: `baseUrl` (default `http://localhost:3000`), `jwt` (token Bearer), `idem` (sufixo da idempotency-key), `id` (ex.: `inv_1`).
	- Inclui: `GET /ready`, `GET /metrics`, `POST /nfse/emitir`, `GET /nfse/:id/xml`, `GET /nfse/:id/pdf`, `GET /nfse`, `POST /nfse/:id/cancel`.

### Licença
Definir conforme política interna.

---
Documento consolidado.
A função `verifyXmlSignature` faz parsing do XML e valida a assinatura encontrada. Futuras melhorias previstas:

### Documentação da API (OpenAPI/Swagger)
- O serviço registra a documentação de forma opcional e segura. Para habilitar a UI em `/docs`, instale as dependências:

```powershell
npm i -E @fastify/swagger @fastify/swagger-ui
```

- A documentação é carregada em tempo de execução via import dinâmico; se os pacotes não estiverem instalados, o serviço continua funcionando normalmente e loga um aviso: "Swagger não carregado (dependência ausente ou incompatível)".
- Rotas anotadas com schemas:
	- Saúde: `/health`, `/live`, `/ready`, `/version`, `/health/deps`, `/health/cert`
	- NFSe:
		- `POST /nfse/emitir`
		- `GET /nfse/:id`
		- `GET /nfse/:id/pdf`
		- `GET /nfse/:id/xml`
		- `GET /nfse` (listagem com filtros `status`, `providerCnpj`, `customerDoc`, `from`, `to` e paginação `page`, `pageSize`)
		- `POST /nfse/:id/cancel` (cancela via agente; retorna 200 com status, incluindo `CANCELLED` quando aplicável)
- As rotas incluem `tags`, `summary` e esquemas de `params`, `headers`, `body` e `response` quando aplicável.

Observação: os campos `tags`/`summary` e alguns esquemas são atribuídos via cast para `any` a fim de evitar conflitos de tipagem com `FastifySchema` quando os plugins Swagger não estão presentes em tempo de build. Isso não impacta a execução.

Autenticação e Components
- Endpoints de NFSe exigem autenticação Bearer (JWT) e estão marcados com `security: bearerAuth` na especificação.
- Os esquemas foram consolidados em `components.schemas` (ex.: `NfseEmitRequest`, `NfseEmitResponse`, `NfseListResponse`, `ErrorEnvelope`, etc.) e referenciados nas rotas via `$ref` para facilitar reuso e consistência.

Obter o documento OpenAPI (JSON):
- Se os pacotes de Swagger estiverem instalados, o documento estará disponível em `GET /openapi.json`.
- Caso não estejam, esse endpoint responderá `503` com a mensagem `Swagger não instalado`.

### Autenticação (JWT) nos endpoints de NFSe
- As rotas `GET /nfse/:id`, `GET /nfse/:id/pdf`, `GET /nfse/:id/xml` e `GET /nfse` exigem o cabeçalho `Authorization: Bearer <token>`.
- Exemplo de requisição (PowerShell):

```powershell
curl -s "http://localhost:3000/nfse/123" -H "Authorization: Bearer $env:JWT_TOKEN"
```

> Dica: defina a variável `JWT_TOKEN` no ambiente antes de chamar.

### Endpoint: POST /nfse/emitir
Requer autenticação Bearer (JWT) e suporta idempotência via cabeçalho opcional.

- Autenticação: `Authorization: Bearer <token>`
- Idempotência (opcional): cabeçalho `idempotency-key: <string>`

Corpo da requisição (JSON) — campos principais:
- `rpsNumber?: string` — número do RPS (se ausente, o serviço auto-numera sequencialmente por `provider.cnpj` + `rpsSeries`).
- `rpsSeries: string`
- `issueDate: string` (ISO-8601)
- `serviceCode: string`
- `serviceDescription: string`
- `serviceAmount: number`
- `taxRate: number` (fração decimal: 0.02 = 2%)
- `issRetained: boolean`
- `cnae?: string`
- `deductionsAmount?: number`
- `provider: { cnpj: string }`
- `customer: { name: string; cpf?: string; cnpj?: string; email?: string }`
- `additionalInfo?: string`

Respostas:
- 202 PENDING — quando o agente retorna processamento assíncrono. Exemplo: `{ id, status: "PENDING" }`.
- 200 SUCCESS — quando autorizado e com número retornado. Ex.: `{ id, status: "SUCCESS", nfseNumber: "2025" }`.
- 401 Unauthorized — sem token válido.
- 422 Unprocessable Entity — falha de normalização/validação do payload.
- 409 Conflict — conflito de idempotência (reserva para cenários de chave reutilizada com payload divergente).

Idempotência:
- Use o cabeçalho `idempotency-key` para garantir que reenvios retornem o mesmo `id`/resultado, evitando duplicações.
- Com a mesma chave, o serviço retorna o estado atual da fatura original (pode ser `PENDING` ou `SUCCESS`).

Exemplo (PowerShell) com arquivo JSON:

1) Crie um arquivo `emit.json` com o payload mínimo válido:

```json
{
	"rpsNumber": "1",
	"rpsSeries": "A",
	"issueDate": "2025-09-16T10:00:00.000Z",
	"serviceCode": "101",
	"serviceDescription": "Serviço de informática",
	"serviceAmount": 150.5,
	"taxRate": 0.02,
	"issRetained": false,
	"provider": { "cnpj": "12345678000199" },
	"customer": { "cnpj": "99887766000155", "name": "Cliente Exemplo" }
}
```

2) Envie a requisição com JWT e, opcionalmente, a chave de idempotência:

```powershell
curl -s -X POST "http://localhost:3000/nfse/emitir" `
	-H "Authorization: Bearer $env:JWT_TOKEN" `
	-H "Content-Type: application/json" `
	-H "idempotency-key: idem-123" `
	--data "@emit.json"
```

Notas:
- Se o agente responder `PENDING`, o HTTP será 202 e o corpo conterá `{ id, status: "PENDING" }`.
- Se o agente responder `SUCCESS`, o HTTP será 200 e o corpo incluirá `nfseNumber`.

Exemplo de erro 409 (conflito de idempotência):

```json
{
	"error": {
		"code": "IDEMPOTENCY_CONFLICT",
		"message": "Same idempotency-key used with a different payload"
	}
}
```
