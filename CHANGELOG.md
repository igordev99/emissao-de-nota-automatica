# Changelog

## v0.1.0 - 2025-09-16

Primeiro corte do MVP com gerador ABRASF robusto, API, testes e documentação.

- Gerador ABRASF (`buildRpsXml`):
  - Atributos do root seguros: proteção a `xmlns`, `xmlns:<prefix>`, `xmlns:xsi`, `xsi:schemaLocation`.
  - Ordenação determinística por padrão e opção `preserveExtraOrder`.
  - Suporte a `Record`, `Array<[k,v]>` e `Map` em `extraRootAttributes`.
  - Deduplicação last-wins; nomes validados (attr e NCName); `nsPrefix`/`rootName` com fallback seguro.
  - Escape de `namespaceUri` e `schemaLocation`.
  - Fix: evitar espaço extra no root quando sem atributos.
  - Helper `toExtraPairs` para normalizar/ajustar ordem com `Map`.
- Tipagem e DX:
  - Overloads de `buildRpsXml` por fonte de extras; export de `BuildOptions`, `ExtraAttrPair`, `ExtraAttrValue` via barrel `src/core/xml`.
- Assinatura/Verificação:
  - `xml-crypto` v5; suporte a SHA-256 (SHA-1 opcional); `verifyXmlSignature` validando assinatura e X509.
- Observabilidade/Serviço:
  - Métricas Prometheus; endpoints de saúde/versão/live/ready; logs silenciosos em teste.
- Testes e Docs:
  - Suíte de testes abrangente (normalização, emissão, assinatura/verificação, métricas, DX do gerador).
  - README com opções avançadas, exemplos e recipes.
