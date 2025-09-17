import { buildRpsXml, toExtraPairs } from '../src/core/xml/abrassf-generator';

const base = {
  rpsNumber: '10',
  rpsSeries: 'A',
  issueDate: '2024-01-01T10:00:00.000Z',
  serviceCode: '101',
  serviceDescription: 'Serviço de <Teste> & "Escapes"',
  serviceAmount: 123.45,
  taxRate: 0.02, // 2%
  issRetained: false,
  cnae: '6201500',
  provider: { cnpj: '11111111000111' },
  customer: { name: 'Empresa & Co', cnpj: '22222222000122' }
} as any;

describe('ABRASF RPS XML generator', () => {
  it('does not insert stray space before > in root when no extra attrs', () => {
    const xml = buildRpsXml(base);
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd">');
    expect(xml).not.toContain('<Rps >');
  });

  it('does not insert stray space before > in namespaced root when no extra attrs', () => {
    const xml = buildRpsXml(base, { nsPrefix: 'nfse' } as any);
    expect(xml).toContain('<nfse:Rps xmlns:nfse="http://www.abrasf.org.br/nfse.xsd">');
    expect(xml).not.toContain('<nfse:Rps >');
  });
  it('renders aliquota as decimal fraction with 4 decimals', () => {
    const xml = buildRpsXml(base);
    expect(xml).toContain('<Aliquota>0.0200</Aliquota>');
  });

  it('formats ValorServicos with 2 decimals', () => {
    const xml = buildRpsXml({ ...base, serviceAmount: 100 });
    expect(xml).toContain('<ValorServicos>100.00</ValorServicos>');
  });

  it('uses Cnpj or Cpf dynamically for Tomador', () => {
    const xmlCnpj = buildRpsXml(base);
    const tomadorCnpj = xmlCnpj.match(/<Tomador>[\s\S]*?<\/Tomador>/)![0];
    expect(tomadorCnpj).toContain('<Cnpj>22222222000122</Cnpj>');
    const xmlCpf = buildRpsXml({ ...base, customer: { name: 'Fulano', cpf: '12345678901' } });
    const tomadorCpf = xmlCpf.match(/<Tomador>[\s\S]*?<\/Tomador>/)![0];
    expect(tomadorCpf).toContain('<Cpf>12345678901</Cpf>');
    expect(tomadorCpf).not.toContain('<Cnpj>');
  });

  it('escapes XML special chars in text fields', () => {
    const xml = buildRpsXml(base);
    expect(xml).toContain('<Discriminacao>Serviço de &lt;Teste&gt; &amp; &quot;Escapes&quot;</Discriminacao>');
    expect(xml).toContain('<RazaoSocial>Empresa &amp; Co</RazaoSocial>');
  });

  it('rounds aliquota to 4 decimal places', () => {
    const xml = buildRpsXml({
      ...base,
      taxRate: 0.02375,
    } as any);
    expect(xml).toContain('<Aliquota>0.0238</Aliquota>');
  });

  it('includes ValorDeducoes when deductionsAmount > 0', () => {
    const xml = buildRpsXml({ ...base, deductionsAmount: 10 } as any);
    expect(xml).toContain('<ValorDeducoes>10.00</ValorDeducoes>');
  });

  it('omits ValorDeducoes when deductionsAmount is 0 or undefined', () => {
    const xml0 = buildRpsXml({ ...base, deductionsAmount: 0 } as any);
    expect(xml0).not.toContain('<ValorDeducoes>');
    const xmlU = buildRpsXml({ ...base, deductionsAmount: undefined } as any);
    expect(xmlU).not.toContain('<ValorDeducoes>');
  });

  it('includes ABRASF namespace on root element', () => {
    const xml = buildRpsXml(base);
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd">');
  });

  it('supports custom namespaceUri and rootName without prefix', () => {
    const xml = buildRpsXml(base, {
      namespaceUri: 'http://example.com/custom',
      rootName: 'RootX',
      extraRootAttributes: { v: '1' }
    } as any);
    expect(xml).toContain('<RootX xmlns="http://example.com/custom" v="1"');
    expect(xml).toContain('</RootX>');
  });

  it('supports custom namespaceUri, rootName and nsPrefix', () => {
    const xml = buildRpsXml(base, {
      namespaceUri: 'http://example.com/custom',
      rootName: 'RootY',
      nsPrefix: 'cx',
      extraRootAttributes: [['a', '1'], ['b', '2']] as any,
      preserveExtraOrder: true
    } as any);
    expect(xml).toContain('<cx:RootY xmlns:cx="http://example.com/custom" a="1" b="2"');
    expect(xml).toContain('</cx:RootY>');
  });

  it('optionally includes xsi:schemaLocation on root', () => {
    const xml = buildRpsXml(base, { includeSchemaLocation: true });
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    expect(xml).toMatch(/xsi:schemaLocation="http:\/\/www\.abrasf\.org\.br\/nfse\.xsd\s+NFSe\.xsd"/);
  });

  it('supports extra attributes on root element', () => {
    const xml = buildRpsXml(base, { extraRootAttributes: { versao: '2.03', 'xmlns:foo': 'http://example.com/foo' } });
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.03" xmlns:foo="http://example.com/foo">');
  });

  it('orders extra root attributes deterministically by key', () => {
    const xml = buildRpsXml(base, { extraRootAttributes: { zzz: '3', aaa: '1', mmm: '2' } });
    // Espera ordem alfabética: aaa, mmm, zzz
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" aaa="1" mmm="2" zzz="3">');
  });

  it('preserves insertion order when preserveExtraOrder=true (still last-wins)', () => {
    const extras: any = {};
    // Inserção na ordem: a=1, c=3, b=2, a=9 (last-wins)
    extras['a'] = '1';
    extras['c'] = '3';
    extras['b'] = '2';
    extras['a'] = '9';
    const xml = buildRpsXml(base, { preserveExtraOrder: true, extraRootAttributes: extras });
  // Em objetos JS, reatribuir a mesma chave não muda sua posição de inserção;
  // então a ordem preservada será a, c, b (com valor de 'a' sendo o último atribuído: 9)
  expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" a="9" c="3" b="2"');
  });

  it('accepts extraRootAttributes as array of pairs and preserves pair order (last-wins by key)', () => {
    const pairs: Array<[string, string|number|boolean]> = [
      ['a', '1'],
      ['c', '3'],
      ['b', '2'],
      ['a', '9'], // last-wins e reposiciona para o fim quando preserveOrder=true
    ];
    const xml = buildRpsXml(base, { preserveExtraOrder: true, extraRootAttributes: pairs });
    // Aqui, como os pares preservam repetição, a política reposiciona 'a' para o fim: c, b, a
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" c="3" b="2" a="9"');
  });

  it('accepts extraRootAttributes as Map and preserves initial insertion order (last-wins in value)', () => {
    const map = new Map<string, string|number|boolean>();
    map.set('x', '1');
    map.set('y', '2');
    map.set('x', '9'); // última vence; com preserveOrder, posição move para o fim
    const xml = buildRpsXml(base, { preserveExtraOrder: true, extraRootAttributes: map });
    // Map não registra repetições; reatribuir a mesma chave NÃO move a posição. Ordem: x, y; valor de x atualizado
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" x="9" y="2"');
  });

  it('toExtraPairs(Map) enables explicit reordering with duplicate pair under preserveExtraOrder', () => {
    const map = new Map<string, string|number|boolean>();
    map.set('x', '1');
    map.set('y', '2');
    // Em Map, reatribuir não move posição; para mover, converta para pares e duplique a chave ao fim
    const pairs = toExtraPairs(map);
    pairs.push(['x', '9']); // reposiciona 'x' para o fim (last-wins)
    const xml = buildRpsXml(base, { preserveExtraOrder: true, extraRootAttributes: pairs });
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" y="2" x="9"');
  });

  it('does not allow overriding reserved root attributes (xmlns, xmlns:xsi, xsi:schemaLocation)', () => {
    const xml = buildRpsXml(base, {
      includeSchemaLocation: true,
      extraRootAttributes: {
        xmlns: 'http://malicious.example/over',
        'xmlns:xsi': 'http://evil/xsi',
        'xsi:schemaLocation': 'http://evil schema.xsd',
        versao: '2.03'
      } as any
    });
    // Mantém os oficiais
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd"');
    expect(xml).toContain('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"');
    expect(xml).toContain('xsi:schemaLocation="http://www.abrasf.org.br/nfse.xsd NFSe.xsd"');
    // Extras válidos permanecem
    expect(xml).toContain('versao="2.03"');
    // E os maliciosos não aparecem
    expect(xml).not.toContain('http://malicious.example/over');
    expect(xml).not.toContain('http://evil/xsi');
    expect(xml).not.toContain('http://evil schema.xsd');
  });

  it('protects namespaced xmlns:<prefix> from being overridden when prefix is used', () => {
    const xml = buildRpsXml(base, {
      nsPrefix: 'nfse',
      extraRootAttributes: {
        'xmlns:nfse': 'http://malicious.example/nfse'
      } as any
    });
    expect(xml).toContain('<nfse:Rps xmlns:nfse="http://www.abrasf.org.br/nfse.xsd"');
    expect(xml).not.toContain('http://malicious.example/nfse');
  });

  it('protects default xmlns from being overridden when nsPrefix is used', () => {
    const xml = buildRpsXml(base, {
      nsPrefix: 'nfse',
      extraRootAttributes: {
        xmlns: 'http://malicious.example/override'
      } as any
    });
    expect(xml).toContain('<nfse:Rps xmlns:nfse="http://www.abrasf.org.br/nfse.xsd"');
    expect(xml).not.toContain('http://malicious.example/override');
  });

  it('escapes special chars in extra root attributes', () => {
    const xml = buildRpsXml(base, { extraRootAttributes: { note: 'a "q" & <x>' } as any });
    // note deve ser escapado: &quot; para aspas, &amp; para &, &lt; para < e &gt; para >
    expect(xml).toContain('note="a &quot;q&quot; &amp; &lt;x&gt;"');
  });

  it('supports number/boolean values in extra root attributes', () => {
    const xml = buildRpsXml(base, { extraRootAttributes: { versao: 2.03, ativo: true } });
    // Ordem determinística por chave (ativo antes de versao)
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" ativo="true" versao="2.03">');
  });

  it('keeps falsy values 0 and false in extra root attributes', () => {
    const xml = buildRpsXml(base, { extraRootAttributes: { zero: 0, flag: false } });
    expect(xml).toContain('zero="0"');
    expect(xml).toContain('flag="false"');
  });

  it('allows namespaced root with prefix', () => {
    const xml = buildRpsXml(base, { nsPrefix: 'nfse' });
    expect(xml).toContain('<nfse:Rps xmlns:nfse="http://www.abrasf.org.br/nfse.xsd">');
    expect(xml).toContain('</nfse:Rps>');
  });

  it('ignores invalid nsPrefix and falls back to default xmlns', () => {
    const xml = buildRpsXml(base, { nsPrefix: '9invalid' } as any);
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd">');
    expect(xml).not.toContain('xmlns:9invalid');
  });

  it('ignores invalid rootName and falls back to Rps', () => {
    const xml = buildRpsXml(base, { rootName: '9Invalid' } as any);
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd">');
    expect(xml).toContain('</Rps>');
  });

  it('includes Prestador/InscricaoMunicipal when provided', () => {
    const xml = buildRpsXml({
      ...base,
      provider: { cnpj: '11111111000111', municipalRegistration: '123456' },
    } as any);
    const prestador = xml.match(/<Prestador>[\s\S]*?<\/Prestador>/)![0];
    expect(prestador).toContain('<InscricaoMunicipal>123456</InscricaoMunicipal>');
  });

  it('omits Prestador/InscricaoMunicipal when not provided', () => {
    const xml = buildRpsXml({
      ...base,
      provider: { cnpj: '11111111000111' },
    } as any);
    const prestador = xml.match(/<Prestador>[\s\S]*?<\/Prestador>/)![0];
    expect(prestador).not.toContain('<InscricaoMunicipal>');
  });

  it('includes OutrasInformacoes when additionalInfo is provided', () => {
    const xml = buildRpsXml({ ...base, additionalInfo: 'Obs & detalhes <importantes>' } as any);
    expect(xml).toContain('<OutrasInformacoes>Obs &amp; detalhes &lt;importantes&gt;</OutrasInformacoes>');
  });

  it('omits OutrasInformacoes when additionalInfo is empty/undefined', () => {
    const xmlU = buildRpsXml({ ...base, additionalInfo: undefined } as any);
    expect(xmlU).not.toContain('<OutrasInformacoes>');
  });

  it('omits CodigoCnae when not provided', () => {
    const xml = buildRpsXml({ ...base, cnae: undefined } as any);
    const servico = xml.match(/<Servico>[\s\S]*?<\/Servico>/)![0];
    expect(servico).not.toContain('<CodigoCnae>');
  });

  it('includes Tomador/Email when provided', () => {
    const xml = buildRpsXml({ ...base, customer: { ...base.customer, email: 'cliente@example.com' } } as any);
    const tomador = xml.match(/<Tomador>[\s\S]*?<\/Tomador>/)![0];
    expect(tomador).toContain('<Email>cliente@example.com</Email>');
  });

  it('includes CodigoTributacaoMunicipio when municipalTaxCode is provided', () => {
    const xml = buildRpsXml({ ...base, municipalTaxCode: '0107' } as any);
    const servico = xml.match(/<Servico>[\s\S]*?<\/Servico>/)![0];
    expect(servico).toContain('<CodigoTributacaoMunicipio>0107</CodigoTributacaoMunicipio>');
  });

  it('omits CodigoTributacaoMunicipio when not provided', () => {
    const xml = buildRpsXml({ ...base, municipalTaxCode: undefined } as any);
    const servico = xml.match(/<Servico>[\s\S]*?<\/Servico>/)![0];
    expect(servico).not.toContain('<CodigoTributacaoMunicipio>');
  });

  it('includes Tomador/Endereco when address is provided', () => {
    const xml = buildRpsXml({
      ...base,
      customer: {
        ...base.customer,
        address: {
          street: 'Rua & Principal',
          number: '123',
          complement: 'Sala <2>',
          district: 'Centro',
          cityCode: '3550308',
          state: 'SP',
          zipCode: '01001000',
        }
      }
    } as any);
    const tomador = xml.match(/<Tomador>[\s\S]*?<\/Tomador>/)![0];
    expect(tomador).toContain('<Endereco>');
    expect(tomador).toContain('<Endereco>Rua &amp; Principal</Endereco>');
    expect(tomador).toContain('<Numero>123</Numero>');
    expect(tomador).toContain('<Complemento>Sala &lt;2&gt;</Complemento>');
    expect(tomador).toContain('<Bairro>Centro</Bairro>');
    expect(tomador).toContain('<CodigoMunicipio>3550308</CodigoMunicipio>');
    expect(tomador).toContain('<Uf>SP</Uf>');
    expect(tomador).toContain('<Cep>01001000</Cep>');
  });

  it('omits Tomador/Endereco when address is not provided', () => {
    const xml = buildRpsXml({ ...base, customer: { ...base.customer, address: undefined } } as any);
    const tomador = xml.match(/<Tomador>[\s\S]*?<\/Tomador>/)![0];
    expect(tomador).not.toContain('<Endereco>\n');
    expect(tomador).not.toContain('<Numero>');
  });

  it('deduplicates extra root attributes by key (last-wins) with trim', () => {
    const xml = buildRpsXml(base, {
      extraRootAttributes: {
        ' versao ': '1.00',
        versao: '2.03' // última vence após trim
      } as any
    });
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd" versao="2.03">');
    // não deve conter as anteriores
    expect(xml).not.toContain('versao="1.00"');
  });

  it('ignores invalid attribute names in extraRootAttributes', () => {
    const xml = buildRpsXml(base, {
      extraRootAttributes: {
        '1invalid': 'x',
        'ns:': 'y',
        'valid_name': 'ok',
        'ns:valid': 'ok2',
      } as any
    });
    // Ordem dos atributos pode variar; verifique presença independente de ordem
    expect(xml).toContain('<Rps xmlns="http://www.abrasf.org.br/nfse.xsd"');
    expect(xml).toContain('valid_name="ok"');
    expect(xml).toContain('ns:valid="ok2"');
    expect(xml).not.toContain('1invalid="x"');
    expect(xml).not.toContain('ns:="y"');
  });
});
