import { NfseNormalized } from '../validation/nfse.schema';

export type ExtraAttrValue = string | number | boolean;
export type ExtraAttrPair = [string, ExtraAttrValue];

export const ABRASF_NS = 'http://www.abrasf.org.br/nfse.xsd';

export type BuildOptions = {
  includeSchemaLocation?: boolean;
  schemaLocation?: string; // default to `${ABRASF_NS} NFSe.xsd` if not provided
  extraRootAttributes?:
    | Record<string, ExtraAttrValue>
    | Array<ExtraAttrPair>
    | Map<string, ExtraAttrValue>; // atributos adicionais opcionais no elemento Rps
  nsPrefix?: string; // ex.: 'nfse' -> <nfse:Rps>
  namespaceUri?: string; // override do ABRASF_NS
  rootName?: string; // override do nome do root (default: 'Rps')
  preserveExtraOrder?: boolean; // quando true, mantém a ordem de inserção dos atributos extras (com last-wins)
};

// Gera XML RPS (layout ABRASF simplificado) - pode ser expandido com namespaces oficiais
// Overloads para melhor inferência ao passar diferentes formas de extraRootAttributes
export function buildRpsXml(data: NfseNormalized, options?: Omit<BuildOptions, 'extraRootAttributes'> & { extraRootAttributes?: Record<string, ExtraAttrValue> }): string;
export function buildRpsXml(data: NfseNormalized, options?: Omit<BuildOptions, 'extraRootAttributes'> & { extraRootAttributes?: Array<ExtraAttrPair> }): string;
export function buildRpsXml(data: NfseNormalized, options?: Omit<BuildOptions, 'extraRootAttributes'> & { extraRootAttributes?: Map<string, ExtraAttrValue> }): string;
export function buildRpsXml(data: NfseNormalized, options?: BuildOptions) {
  const issue = new Date(data.issueDate).toISOString();
  const valorServicos = data.serviceAmount.toFixed(2);
  // ABRASF espera a alíquota como fração decimal (ex.: 0.0200 para 2%)
  const aliquota = data.taxRate.toFixed(4);
  const valorDeducoes = typeof data.deductionsAmount === 'number' && data.deductionsAmount > 0
    ? data.deductionsAmount.toFixed(2)
    : undefined;
  const includeSchemaLocation = options?.includeSchemaLocation === true;
  const nsUri = options?.namespaceUri || ABRASF_NS;
  const schemaLocation = options?.schemaLocation || `${nsUri} NFSe.xsd`;
  const rawPrefix = options?.nsPrefix?.trim();
  const nsPrefix = rawPrefix && isValidXmlNcName(rawPrefix) ? rawPrefix : undefined;
  const xmlNsAttr = nsPrefix ? `xmlns:${nsPrefix}` : 'xmlns';
  const baseAttrParts = [
    `${xmlNsAttr}="${escape(nsUri)}"`,
    ...(includeSchemaLocation ? [
      `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"`,
      `xsi:schemaLocation="${escape(schemaLocation)}"`
    ] : [])
  ];
  // Evita duplicação/override de atributos reservados no root
  const reserved = new Set<string>([
    // Sempre proteger tanto o atributo usado (xmlns ou xmlns:<prefix>) quanto o padrão 'xmlns'
    xmlNsAttr,
    'xmlns',
    ...(includeSchemaLocation ? ['xmlns:xsi', 'xsi:schemaLocation'] as const : []),
  ]);
  const preserveOrder = options?.preserveExtraOrder === true;
  const extraAttrParts = options?.extraRootAttributes
    ? (() => {
        // Normaliza entrada para pares [k,v]: suporta Record, Array de pares e Map
        const raw = options.extraRootAttributes as
          | Record<string, ExtraAttrValue>
          | Array<ExtraAttrPair>
          | Map<string, ExtraAttrValue>;
        const entriesSource: Array<[string, ExtraAttrValue]> = Array.isArray(raw)
          ? raw
          : raw instanceof Map
          ? Array.from(raw.entries())
          : Object.entries(raw);

        if (preserveOrder) {
          // Mantém ordem de inserção e reposiciona chave duplicada para o fim (last-wins)
          const ordered: Array<[string, string]> = [];
          for (const [rawK, rawV] of entriesSource) {
            const k = typeof rawK === 'string' ? rawK.trim() : (rawK as string);
            if (!k || rawV == null) continue;
            if (!isValidXmlAttrName(k)) continue;
            if (reserved.has(k)) continue;
            const v = String(rawV);
            const idx = ordered.findIndex(([ek]) => ek === k);
            if (idx >= 0) ordered.splice(idx, 1);
            ordered.push([k, v]);
          }
          return ordered.map(([k, v]) => `${k}="${escape(v)}"`);
        } else {
          // Ordenação determinística por chave
          const byKey = new Map<string, string>();
          for (const [rawK, rawV] of entriesSource) {
            const k = typeof rawK === 'string' ? rawK.trim() : (rawK as string);
            if (!k || rawV == null) continue;
            if (!isValidXmlAttrName(k)) continue;
            if (reserved.has(k)) continue;
            const v = String(rawV);
            byKey.set(k, v); // last-wins por chave
          }
          return Array.from(byKey.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}="${escape(v)}"`);
        }
      })()
    : [];
  const rootAttrString = [...baseAttrParts, ...extraAttrParts].join(' ');
  const rawRootName = (options?.rootName || 'Rps').trim();
  const rootName = isValidXmlNcName(rawRootName) ? rawRootName : 'Rps';
  const qRoot = nsPrefix ? `${nsPrefix}:${rootName}` : rootName;
  return trim(`<?xml version="1.0" encoding="UTF-8"?>
<${qRoot}${rootAttrString ? ' ' + rootAttrString : ''}>
  <IdentificacaoRps>
    <Numero>${escape(data.rpsNumber!)}</Numero>
    <Serie>${escape(data.rpsSeries!)}</Serie>
    <Tipo>1</Tipo>
  </IdentificacaoRps>
  <DataEmissao>${issue}</DataEmissao>
  <NaturezaOperacao>1</NaturezaOperacao>
  <OptanteSimplesNacional>2</OptanteSimplesNacional>
  <IncentivadorCultural>2</IncentivadorCultural>
  <Status>1</Status>
  <Servico>
    <Valores>
      <ValorServicos>${valorServicos}</ValorServicos>
      <IssRetido>${data.issRetained ? 1 : 2}</IssRetido>
      <Aliquota>${aliquota}</Aliquota>
      ${valorDeducoes ? `<ValorDeducoes>${valorDeducoes}</ValorDeducoes>` : ''}
    </Valores>
    <ItemListaServico>${escape(data.serviceCode)}</ItemListaServico>
    <Discriminacao>${escape(data.serviceDescription)}</Discriminacao>
    ${data.municipalTaxCode ? `<CodigoTributacaoMunicipio>${escape(data.municipalTaxCode)}</CodigoTributacaoMunicipio>` : ''}
    ${data.cnae ? `<CodigoCnae>${escape(data.cnae)}</CodigoCnae>` : ''}
  </Servico>
  <Prestador>
    <Cnpj>${escape(data.provider.cnpj)}</Cnpj>
    ${data.provider.municipalRegistration ? `<InscricaoMunicipal>${escape(data.provider.municipalRegistration)}</InscricaoMunicipal>` : ''}
  </Prestador>
  <Tomador>
    <IdentificacaoTomador>
      <CpfCnpj>
        ${data.customer.cnpj ? `<Cnpj>${escape(data.customer.cnpj)}</Cnpj>` : `<Cpf>${escape(data.customer.cpf || '')}</Cpf>`}
      </CpfCnpj>
    </IdentificacaoTomador>
    <RazaoSocial>${escape(data.customer.name)}</RazaoSocial>
    ${data.customer.email ? `<Email>${escape(data.customer.email)}</Email>` : ''}
    ${data.customer.address ? `
    <Endereco>
      ${data.customer.address.street ? `<Endereco>${escape(data.customer.address.street)}</Endereco>` : ''}
      ${data.customer.address.number ? `<Numero>${escape(data.customer.address.number)}</Numero>` : ''}
      ${data.customer.address.complement ? `<Complemento>${escape(data.customer.address.complement)}</Complemento>` : ''}
      ${data.customer.address.district ? `<Bairro>${escape(data.customer.address.district)}</Bairro>` : ''}
      ${data.customer.address.cityCode ? `<CodigoMunicipio>${escape(data.customer.address.cityCode)}</CodigoMunicipio>` : ''}
      ${data.customer.address.state ? `<Uf>${escape(data.customer.address.state)}</Uf>` : ''}
      ${data.customer.address.zipCode ? `<Cep>${escape(data.customer.address.zipCode)}</Cep>` : ''}
    </Endereco>` : ''}
  </Tomador>
  ${data.additionalInfo ? `<OutrasInformacoes>${escape(data.additionalInfo)}</OutrasInformacoes>` : ''}
</${qRoot}>`);
}

// Helper de DX: normaliza `extraRootAttributes` para Array de pares.
// Útil quando você quer controlar a posição de uma chave repetida sob `preserveExtraOrder: true`
// (basta duplicar o par desejado no array após a conversão).
export function toExtraPairs(
  extras: Record<string, ExtraAttrValue> | Map<string, ExtraAttrValue> | Array<ExtraAttrPair>
): Array<ExtraAttrPair> {
  if (Array.isArray(extras)) return extras.slice();
  if (extras instanceof Map) return Array.from(extras.entries());
  return Object.entries(extras) as Array<ExtraAttrPair>;
}

function escape(str: string) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function trim(xml: string) {
  return xml.replace(/\n\s+/g, '\n').trim();
}

// Nome de atributo XML simplificado: começa com letra ou sublinhado, pode conter letras, dígitos, hífen, underscore, ponto,
// e opcionalmente um prefixo seguido de ':' (ex.: 'ns:attr'). Não é um validador XML completo, mas cobre casos comuns.
function isValidXmlAttrName(name: string): boolean {
  return /^(?:[A-Za-z_][\w\-.]*:)?[A-Za-z_][\w\-.]*$/.test(name);
}

// NCName simplificado (sem ':'): para validar nsPrefix e rootName
function isValidXmlNcName(name: string): boolean {
  return /^[A-Za-z_][\w\-.]*$/.test(name);
}
