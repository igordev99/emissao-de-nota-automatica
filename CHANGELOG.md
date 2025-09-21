# Changelog

## [0.1.2](https://github.com/igordev99/emissao-de-nota-automatica/compare/nfse-sp-service-v0.1.1...nfse-sp-service-v0.1.2) (2025-09-21)


### Features

* add authentication service for handling login, logout, and user session management ([2adefeb](https://github.com/igordev99/emissao-de-nota-automatica/commit/2adefebd1f8e312bfe9a7be6f34ef1eafaa14936))
* add Suppliers management page with search, delete, and pagination features ([2adefeb](https://github.com/igordev99/emissao-de-nota-automatica/commit/2adefebd1f8e312bfe9a7be6f34ef1eafaa14936))
* create Webhooks overview page to manage webhook configurations ([2adefeb](https://github.com/igordev99/emissao-de-nota-automatica/commit/2adefebd1f8e312bfe9a7be6f34ef1eafaa14936))
* DX Windows e smoke autônomo (AutoStartDev), melhorias NFSe e client ([03d7bc8](https://github.com/igordev99/emissao-de-nota-automatica/commit/03d7bc8ba0c89ff473862a0f914abee7f5d5bdc5))
* enable webhook and retry routes; refactor account, client, and supplier routes to simplify schema usage ([8cb03cb](https://github.com/igordev99/emissao-de-nota-automatica/commit/8cb03cb9fb56eee24dc3f2b0e8af75f84edc1e72))
* implement client management module with CRUD operations ([5384050](https://github.com/igordev99/emissao-de-nota-automatica/commit/53840504b49c0a5b595d1cb5e5f3da3ed223fd6e))
* implement Webhook form for creating and editing webhooks with event selection ([2adefeb](https://github.com/igordev99/emissao-de-nota-automatica/commit/2adefebd1f8e312bfe9a7be6f34ef1eafaa14936))
* implement webhooks service for CRUD operations on webhooks ([2adefeb](https://github.com/igordev99/emissao-de-nota-automatica/commit/2adefebd1f8e312bfe9a7be6f34ef1eafaa14936))
* initialize UI project with Vite, React, and TypeScript ([2a606d7](https://github.com/igordev99/emissao-de-nota-automatica/commit/2a606d7538b31dbe3b63dd463fdcde1d1bae003b))


### Bug Fixes

* add initial database migration to fix CI deployment ([6fb3b24](https://github.com/igordev99/emissao-de-nota-automatica/commit/6fb3b2417f5a41a0b4e82c2e65fa65681c341b34))
* correct migration order and make idempotent ([5051bce](https://github.com/igordev99/emissao-de-nota-automatica/commit/5051bce91dd9918dd72f134066369e66685ecb91))
* **routes:** inline NFSe route schemas to avoid  AJV issues ([08117b8](https://github.com/igordev99/emissao-de-nota-automatica/commit/08117b8af99e294f71af55b1811d5d5e22af9a56))
* **smoke:** ensure Param is first and set working directory for auto-start; feat(nfse): include verificationCode in GET /nfse/:id response ([0ead4a7](https://github.com/igordev99/emissao-de-nota-automatica/commit/0ead4a7d19f96f26e18b53ba59727994807e7aac))

## v0.1.1 - 2025-09-16

Hardening de segurança e pequenas melhorias.

- Segurança: upgrade `xml-crypto` para `6.1.2` (corrige advisories críticos de assinatura XML).
- Gerador ABRASF: refactor na montagem da tag raiz usando join seguro para evitar espaço extra e simplificar leitura.
- Testes: adicionados testes de regressão garantindo que não haja espaço antes de `>` no root (`<Rps>` e `<nfse:Rps>`).

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
