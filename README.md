## NFSe SP Service

[![CI](https://github.com/igordev99/emissao-de-nota-automatica/actions/workflows/ci.yml/badge.svg)](https://github.com/igordev99/emissao-de-nota-automatica/actions)
[![Smoke (Windows)](https://github.com/igordev99/emissao-de-nota-automatica/actions/workflows/smoke-windows.yml/badge.svg?branch=main)](https://github.com/igordev99/emissao-de-nota-automatica/actions/workflows/smoke-windows.yml)
[![Release](https://img.shields.io/github/v/release/igordev99/emissao-de-nota-automatica?display_name=tag&logo=github)](https://github.com/igordev99/emissao-de-nota-automatica/releases)
[![GHCR](https://img.shields.io/badge/GHCR-emissao--de--nota--automatica-blue?logo=docker)](https://github.com/users/igordev99/packages)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
Serviço em Node.js / TypeScript para emissão de NFS-e (modelo São Paulo) com:
- Normalização e validação (Zod)
- Idempotência e persistência (Prisma)
- Assinatura e verificação XML (xml-crypto v6.1.2)
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

### Quickstart local (resumo)
1) Dependências e Prisma Client:
```powershell
npm ci
npm run prisma:generate
```
2) Banco e migrações (ou use um comando só no passo 3):
```powershell
# Subir Postgres (Docker)
npm run db:up
# Aplicar migrações Prisma
npm run prisma:migrate
```
3) Subir API (dev):
```powershell
npm run dev:local
```

Atalho (um comando só):
```powershell
npm run dev:up
```
Esse script: sobe o DB via Docker, aguarda a porta 5432 responder, aplica migrações e inicia o servidor de desenvolvimento.

Modo sem banco (memória) — útil quando você não tem Docker/Postgres:
```powershell
npm run dev:mem
```

Atalho Windows (libera a porta e inicia em memória):
```powershell
npm run dev:mem:win
```

Start completo no Windows (libera porta, sobe servidor, espera /live e roda smoke):
```powershell
npm run dev:win:start
```
Start completo no Windows salvando relatório JSON automaticamente:
```powershell
npm run dev:win:start-report
```
Atalho Windows para teste rápido de emissão (sem baixar artefatos e sem cancelar):
```powershell
npm run dev:win:emit-only
```
Atalho Windows (emit-only) salvando relatório JSON automaticamente:
```powershell
npm run dev:win:emit-report
```
Observações do modo memória:
- Os dados não são persistidos (somem ao reiniciar).
- Idempotência e numeração RPS funcionam na sessão atual.
- O smoke funciona normalmente (agente em modo stub se `AGENT_BASE_URL` não estiver definido).
4) Token de dev e chamadas (PowerShell):
```powershell
# Opção A: gerar um token localmente (sem chamar a API)
$jwt = (npm run -s token -- --sub dev --roles tester | ConvertFrom-Json).token

# Opção B: obter token do endpoint de dev (não disponível em produção)
$jwt = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:3000/auth/token -ContentType 'application/json' -Body '{}' | Select-Object -ExpandProperty token

Invoke-RestMethod -Method Get -Uri http://127.0.0.1:3000/live -Headers @{ Authorization = "Bearer $jwt" } | ConvertTo-Json
```

Diagnóstico rápido e smoke enxuto:
```powershell
npm run health
# Usando token gerado localmente
$jwt = (npm run -s token -- --sub dev --roles tester | ConvertFrom-Json).token
npm run smoke:fast -- -Token $jwt
```

Smoke somente de emissão (sem artefatos e sem cancelamento):
```powershell
npm run smoke:emit-only
```
Você também pode passar os parâmetros manualmente:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\smoke.ps1 -BaseUrl http://127.0.0.1:3000 -SkipArtifacts -NoCancel
```
Notas do smoke:
- O script imprime `x-correlation-id` das respostas para facilitar a correlação com logs.
- A chave padrão de idempotência é randomizada por execução e, se receber `409 Conflict`, o script rotaciona a chave e reenvia.

Gerar relatório JSON do smoke (útil para CI/diagnóstico):
```powershell
npm run smoke:report
# ou manualmente
$ts = Get-Date -Format yyyyMMdd_HHmmss
./scripts/smoke.ps1 -SkipArtifacts -NoCancel -JsonOut "./smoke_$ts.json"
```
Campos incluídos no JSON: `baseUrl`, `startedAt`, `finishedAt`, `idempotencyKey`,
`emit{ id, nfseNumber, status, correlationId, httpStatus, httpStatusCode, durationMs }`,
`list{ total, itemsCount, durationMs }`,
`artifacts{ xmlLength, pdfLength, durationMs }`,
`cancel{ status|skipped, canceledAt, correlationId, httpStatus, httpStatusCode, durationMs }`,
`steps[]` (cada passo contém `step`, `ok`, `durationMs` e, quando aplicável, `error`, `httpStatusCode`). O relatório também inclui `totalDurationMs` para o tempo total da execução.

### Correlação (Correlation ID)
- A API aceita o cabeçalho `x-correlation-id` (ou `x-request-id`) em qualquer requisição e o propaga no contexto.
- Todas as respostas retornam o cabeçalho `x-correlation-id`. O `smoke.ps1` imprime esse valor para ajudar no trace.
- O cliente TypeScript (`src/client/nfse-client.ts`) injeta automaticamente um `x-correlation-id` (customizável por callback/string) e expõe o valor retornado no `onResponse`.

### Atalhos no VS Code
- Tasks adicionadas em `.vscode/tasks.json`:
  - `Smoke: Emit Only` → roda `npm run smoke:emit-only`.
  - `Dev: Start + Emit Only (Windows)` → roda `npm run dev:win:emit-only` (libera porta, inicia em memória e executa smoke sem cancelar).
	- `Smoke: Report` → roda `npm run smoke:report` e salva um arquivo `smoke_YYYYMMDD_HHMMSS.json` no diretório raiz.

Resumo rápido do último relatório gerado:
```powershell
npm run smoke:report:summary
```
Ou de um arquivo específico:
```powershell
npm run smoke:summary -- ./smoke_20250917_170932.json
```

### Troubleshooting
1) `409 Conflict` ao emitir:
	- Causa comum: reutilização de `Idempotency-Key` com payload diferente (o serviço associa a chave ao hash do payload na primeira chamada).
	- Soluções:
	  - Gere uma nova chave (ex.: GUID) ou deixe o `smoke.ps1` randomizar automaticamente.
	  - Se a intenção é reprocessar a mesma emissão, garanta que o payload seja idêntico ao da primeira tentativa.
2) Token de dev indisponível (`/auth/token`):
	- Gere localmente: `npm run -s token -- --sub dev --roles tester | ConvertFrom-Json` e passe `-Token` no smoke/CLI.
3) Serviço não fica live:
	- Use `npm run dev:win:start` para iniciar + diagnosticar; veja o PID e verifique logs.

Demo fim-a-fim (gera token, emite, lista, baixa XML/PDF, cancela):
```powershell
npm run demo:emit
```

Demo rápido (gera token, emite e consulta por ID):
```powershell
npm run demo:quick
```

Demo emissão real (usa AGENT_BASE_URL e PFX do ambiente):
```powershell
$env:AGENT_BASE_URL="https://seu-agente..."
$env:CERT_PFX_PATH="C:\caminho\seu.pfx"
$env:CERT_PFX_PASSWORD="senha"
npm run demo:real
```

CLI de desenvolvimento (sem depender de curl/Postman):
```powershell
# Preparar um token (gerado localmente)
$jwt = (npm run -s token -- --sub dev --roles tester | ConvertFrom-Json).token

# Emitir usando um arquivo JSON de exemplo (temos vários):
# - examples/emit.json (mínimo)
# - examples/emit-cpf.json (tomador CPF)
# - examples/emit-iss-retido.json (ISS retido)
# - examples/emit-address.json (endereço completo)
# - examples/emit-deductions.json (com deduções)
npm run -s cli -- emit --body examples/emit.json --idem idem-123 --token $jwt --pretty

# Exemplos individuais
npm run -s cli -- emit --body examples/emit-cpf.json --idem idem-cpf --token $jwt --pretty
npm run -s cli -- emit --body examples/emit-iss-retido.json --idem idem-iss --token $jwt --pretty
npm run -s cli -- emit --body examples/emit-address.json --idem idem-end --token $jwt --pretty
npm run -s cli -- emit --body examples/emit-deductions.json --idem idem-ded --token $jwt --pretty

# Consultar por ID
npm run -s cli -- get --id inv_1 --token $jwt --pretty

# Listar com filtros
npm run -s cli -- list --status SUCCESS --page 1 --pageSize 5 --token $jwt --pretty

# Baixar XML (base64 para arquivo)
npm run -s cli -- xml --id inv_1 --out xml.b64 --token $jwt

# Baixar PDF (decodificar base64 e salvar binário)
npm run -s cli -- pdf --id inv_1 --out nfse.pdf --decode --token $jwt

# Cancelar com motivo
npm run -s cli -- cancel --id inv_1 --reason "Erro de digitação" --token $jwt --pretty
```

Liberar porta (Windows):
```powershell
npm run port:free
```

Observações de desenvolvimento:
- Quando `AGENT_BASE_URL` não está definido, o cliente do agente opera em modo stub: retorna NFS-e fake (`status: SUCCESS`), XML/PDF base64 e cancelamento `CANCELLED`. Defina `AGENT_BASE_URL` (e opcionalmente `CERT_PFX_PATH`/`CERT_PFX_PASSWORD`) para usar o agente real.
- O endpoint `POST /auth/token` só existe quando `NODE_ENV` não é `production`.

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

Usando a imagem publicada no GHCR:
```powershell
docker pull ghcr.io/igordev99/emissao-de-nota-automatica:v0.1.1
docker run --rm -p 3000:3000 ^
	-e NODE_ENV=production ^
	-e JWT_SECRET=change_me ^
	-e LOG_LEVEL=info ^
	 ghcr.io/igordev99/emissao-de-nota-automatica:v0.1.1
```

Observação sobre autenticação no GHCR:
- Para repositórios privados, faça login antes de dar pull:
```powershell
echo $env:GHCR_PAT | docker login ghcr.io -u <seu-usuario-github> --password-stdin
```
- Gere um PAT (classic) com escopo `read:packages` e exporte em `GHCR_PAT`.

### Cobertura
Limiares mínimos definidos em `package.json` (coverageThreshold). Ajuste conforme evolução.

### Roadmap Sugerido
- Implementar endpoints REST completos
- Envio real para agente / prefeitura
- Criptografia de XML assinado armazenado (AES-256-GCM)
- Observabilidade (tracing + métricas)
- Política de rotação de certificados

### Releases e Versionamento
Este repositório usa Release Please para automatizar o versionamento semântico, changelog, criação de tag e GitHub Release.

Fluxo:
- Ao fazer merge na `main`, um PR de release é aberto/atualizado automaticamente (ex.: `chore: release v0.1.2`).
- Revise e faça merge do PR de release.
- No merge, a action cria a tag `vX.Y.Z` e um GitHub Release com notas.
- O workflow de CI é disparado para a tag e publica a imagem no GHCR com a tag semântica, além de tags de branch e SHA.

Consumindo imagens:
- Semver fixo: `ghcr.io/igordev99/emissao-de-nota-automatica:v0.1.1`
- Última de uma série (se configurado no futuro): `v0.1` ou `latest` (consulte as tags disponíveis no GHCR)

### Exemplos de uso da API (curl)
Autenticação (JWT) — obtenha um token (fora do escopo deste README) e exporte:
```powershell
$env:TOKEN = "<seu-jwt>"
```

Em desenvolvimento/teste, você pode obter um token diretamente do serviço (não disponível em produção):
```powershell
curl -X POST http://localhost:3000/auth/token -H "Content-Type: application/json" -d '{"sub":"tester"}'
# copie o valor de .token do JSON retornado e exporte em $env:TOKEN
```

Emitir NFS-e (com idempotência):
```bash
curl -X POST http://localhost:3000/nfse/emitir \
	-H "Authorization: Bearer $TOKEN" \
	-H "Content-Type: application/json" \
	-H "Idempotency-Key: inv_123_$(date +%s)" \
	-d '{
		"rpsSeries":"A",
		"issueDate":"2025-09-16T10:00:00.000Z",
		"serviceCode":"101",
		"serviceDescription":"Serviço de informática",
		"serviceAmount":150.5,
		"taxRate":0.02,
		"issRetained":false,
		"provider": { "cnpj":"12345678000199" },
		"customer": { "cnpj":"99887766000155", "name":"Cliente Exemplo" }
	}'
```

Consultar status por ID:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/nfse/inv_123
```

Obter XML/PDF (base64):
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/nfse/inv_123/xml
curl -H "Authorization: Bearer $TOKEN" http://localhost:3000/nfse/inv_123/pdf
```

Listar com filtros (inclui nfseNumber):
```bash
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/nfse?page=1&pageSize=20&status=SUCCESS"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/nfse?nfseNumber=2025XXXX"
```

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

Dump via script (sem depender da rota HTTP):
```powershell
# Imprime no stdout
npm run openapi:dump
# Salva no arquivo
npm run openapi:dump > openapi.json
```

Gerar tipos TypeScript a partir do OpenAPI (útil para clientes):
```powershell
npm run openapi:types
# Tipos gerados em: src/types/openapi.d.ts
```

### Sanidade de Certificado PFX e Agente (TLS)
Verifique rapidamente se seu PFX e o endpoint do agente estão OK antes de habilitar a integração real.

1) Checar PFX (thumbprint e validade):
```powershell
$env:CERT_PFX_PATH="C:\caminho\seu.pfx"
$env:CERT_PFX_PASSWORD="senha-opcional"
npm run -s check:pfx
```
Saída JSON esperada (exemplo):
```json
{"ok":true,"thumbprint":"ABC123...","notBefore":"2025-08-01T12:00:00.000Z","notAfter":"2026-08-01T12:00:00.000Z","daysToExpire":300}
```

2) Checar agente (TLS/mTLS):
```powershell
$env:AGENT_BASE_URL="https://seu-agente.exemplo.com/ping"
# opcional mTLS
$env:CERT_PFX_PATH="C:\caminho\seu.pfx"
$env:CERT_PFX_PASSWORD="senha"
npm run -s check:agent
```
Saída JSON esperada (exemplo):
```json
{"ok":true,"status":200}
```

### Playbook: Integrando com agente real
Passo a passo recomendado para ligar a integração real com mTLS:

1) Pré-checagens
- `npm run -s check:pfx` → confirme `thumbprint` e `daysToExpire` > 0
- `npm run -s check:agent` com `AGENT_BASE_URL` e PFX (se o agente exigir mTLS)

2) Subir o serviço apontando para o agente (pode ser em memória):
```powershell
$env:AGENT_BASE_URL="https://seu-agente..."
$env:CERT_PFX_PATH="C:\caminho\seu.pfx"
$env:CERT_PFX_PASSWORD="senha"
npm run dev:win:start
```

3) Emissão real (via CLI ou cliente TS)
- CLI: `npm run -s cli -- emit --body examples/emit.json --idem idem-$(Get-Date -Format yyyyMMddHHmmss) --token (npm run -s token | ConvertFrom-Json).token --pretty`
- Cliente TS: use `createNfseClient` e os métodos `emit/get/list/...` com timeouts/retries e `onResponse` para logar `x-correlation-id`.

4) Troubleshooting (erros comuns)
- "CERT_PFX_PATH not configured": defina as variáveis e valide com `check:pfx`.
- "certificate unknown/SELF_SIGNED_CERT_IN_CHAIN": verifique cadeia/intermediários no agente ou ajuste trust store conforme política da sua infra.
- TLS protocol/version: requer TLS 1.2+ (ajustado no `https.Agent`).
- SNI/Hostname mismatch: confirme que o `AGENT_BASE_URL` corresponde ao CN/SAN do certificado do servidor.
- Timeout/conexão reset: ajuste `retry` e `defaultTimeoutMs` no cliente; verifique firewall/proxy.

Cliente TypeScript (Node 18+)
```ts
import { createNfseClient } from './src/client';

const client = createNfseClient({
	baseUrl: 'http://127.0.0.1:3000',
	token: process.env.JWT_TOKEN // ou use getToken()
});

const emitted = await client.emit({
	rpsSeries: 'A',
	issueDate: new Date().toISOString(),
	serviceCode: '101',
	serviceDescription: 'Teste',
	serviceAmount: 100,
	taxRate: 0.02,
	issRetained: false,
	provider: { cnpj: '11111111000191' },
	customer: { name: 'Cliente Teste', cpf: '12345678909' }
}, { idempotencyKey: 'demo-' + Date.now() });

const got = await client.get(emitted.id);
const list = await client.list({ page: 1, pageSize: 10 });
const xml = await client.xml(emitted.id);
const pdf = await client.pdf(emitted.id);
const cancelled = await client.cancel(emitted.id, 'Cancel demo');
```

Overrides por chamada (timeout/retry/correlation):
```ts
// Exemplo: aumentar timeout e tentativas apenas nesta chamada
const got = await client.get('inv_123', {
	timeoutMs: 15000,
	retry: { retries: 3, minDelayMs: 500 },
	correlationId: 'get-inv-123'
});
```

Capturar headers/resposta (ex.: correlation-id) com callback:
```ts
const client = createNfseClient({
	baseUrl: 'http://127.0.0.1:3000',
	getToken: () => process.env.JWT_TOKEN!,
	onResponse: ({ status, headers, correlationId, url }) => {
		console.log('HTTP', status, 'cid=', correlationId, 'url=', url);
	}
});

// Ou apenas nesta chamada
await client.emit(payload, {
	idempotencyKey: 'idem-1',
	onResponse: (meta) => console.log('emit meta:', meta)
});
```

Opções avançadas do cliente (timeouts, retries, correlation-id):
```ts
const client = createNfseClient({
	baseUrl: 'http://127.0.0.1:3000',
	getToken: () => process.env.JWT_TOKEN!,
	// Timeout por requisição (ms). Padrão: 10000
	defaultTimeoutMs: 10000,
	// Política de retry para erros transitórios
	retry: {
		retries: 2,        // tentativas adicionais (total = 1 + retries)
		minDelayMs: 300,   // backoff inicial
		maxDelayMs: 2000,  // teto do backoff
		backoffFactor: 2,  // multiplicador do delay
		// opcional: personalizar quando fazer retry
		// retryOn: (status) => status === 429 || (status >= 500 && status < 600)
	},
	// Correlation-id por request (aparece nos logs do servidor)
	correlationId: () => `cli-${Date.now().toString(16)}-${Math.random().toString(16).slice(2,10)}`,
});
```

Demo do cliente:
```powershell
npm run client:demo
```

Verificar assinatura XML (arquivo ou base64):
```powershell
# De um arquivo XML assinado
npm run -s verify:xml -- --file examples/rps-sample.xml

# A partir de base64 (ex.: xml.b64)
$b64 = Get-Content xml.b64 -Raw
npm run -s verify:xml -- --b64 $b64
```

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

## Quickstart local no Windows (PowerShell)

Pré-requisitos:
- Docker Desktop (para banco local opcional)
- Node.js 20.x e npm

1) Subir Postgres via Docker (opcional, se não tiver banco):
```powershell
docker run --name nfse-postgres -e POSTGRES_USER=nfse -e POSTGRES_PASSWORD=nfse -e POSTGRES_DB=nfse -p 5432:5432 -d postgres:16-alpine
```

2) Aplicar migrações do Prisma (gera também o Prisma Client):
```powershell
npm install
npm run prisma:migrate
```

3) Iniciar o servidor em modo desenvolvimento (com variáveis padrão):
```powershell
npm run dev:local
```
Observações:
- O modo desenvolvimento expõe um endpoint `POST /auth/token` para obter um token JWT temporário.
- Se a variável `AGENT_BASE_URL` NÃO estiver definida, o cliente de agente roda em modo stub, permitindo testes end-to-end locais sem integrações externas.

4) Smoke test automático (opcional):
```powershell
./scripts/smoke.ps1 -BaseUrl "http://localhost:3000"
# ou
npm run smoke
```
Esse script realiza: emissão (stub), listagem (com filtro `nfseNumber` quando disponível), download de XML/PDF e cancelamento.

5) Testes e build:
```powershell
npm test
npm run build
```

### Nota de migração (payloadHash)
Foi adicionada a coluna `payloadHash` à tabela `IdempotencyKey`. Após atualizar o código, aplique a migração:
```powershell
npm run prisma:migrate
```
Em produção, use:
```powershell
npx prisma migrate deploy
```
