import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

export async function upholdConfigRoutes(app: FastifyInstance) {
  
  // Extrair dados de configuração do Uphold (tipos de serviço, fórmulas, fechamento)
  app.post('/extract-uphold-config', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Email e senha são obrigatórios'
        });
      }

      // Executar script de exploração de módulos
      const scriptPath = path.resolve(process.cwd(), 'scripts', 'explore-uphold-modules.js');
      
      try {
        await fs.access(scriptPath);
      } catch {
        return reply.status(500).send({
          error: 'SCRIPT_NOT_FOUND',
          message: 'Script de exploração não encontrado'
        });
      }

      const { stdout, stderr } = await execFileAsync('node', [scriptPath], {
        env: {
          ...process.env,
          UPHOLD_EMAIL: email,
          UPHOLD_PASSWORD: password
        },
        timeout: 180000 // 3 minutos timeout
      });

      if (stderr) {
        app.log.warn({ stderr }, 'Script stderr output');
      }

      // Parsear resultado
      let extractedData;
      try {
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        extractedData = JSON.parse(lastLine);
      } catch (parseError) {
        app.log.error(`Failed to parse config extraction result: ${parseError}`);
        return reply.status(500).send({
          error: 'PARSE_ERROR',
          message: 'Erro ao processar dados de configuração extraídos',
          debug: stdout
        });
      }

      return reply.send({
        success: true,
        message: `Configurações extraídas com sucesso`,
        config: extractedData,
        extractedAt: new Date().toISOString()
      });

    } catch (error: any) {
      app.log.error('Config extraction error:', error);
      
      if (error.code === 'ETIMEDOUT') {
        return reply.status(408).send({
          error: 'TIMEOUT',
          message: 'Tempo limite excedido na extração de configurações'
        });
      }

      return reply.status(500).send({
        error: 'EXTRACTION_ERROR',
        message: 'Erro durante a extração das configurações',
        details: error.message
      });
    }
  });

  // Extrair especificamente fórmulas de cálculo
  app.post('/extract-formulas', async (request, reply) => {
    try {
      const { email, password } = request.body as { email: string; password: string };

      if (!email || !password) {
        return reply.status(400).send({
          error: 'VALIDATION_ERROR',
          message: 'Email e senha são obrigatórios'
        });
      }

      const scriptPath = path.resolve(process.cwd(), 'scripts', 'extract-formulas.js');
      
      try {
        await fs.access(scriptPath);
      } catch {
        return reply.status(500).send({
          error: 'SCRIPT_NOT_FOUND',
          message: 'Script de extração de fórmulas não encontrado'
        });
      }

      const { stdout, stderr } = await execFileAsync('node', [scriptPath], {
        env: {
          ...process.env,
          UPHOLD_EMAIL: email,
          UPHOLD_PASSWORD: password
        },
        timeout: 120000
      });

      if (stderr) {
        app.log.warn({ stderr }, 'Formulas script stderr output');
      }

      let extractedData;
      try {
        const lines = stdout.trim().split('\n');
        const lastLine = lines[lines.length - 1];
        extractedData = JSON.parse(lastLine);
      } catch (parseError) {
        app.log.error(`Failed to parse formulas extraction result: ${parseError}`);
        return reply.status(500).send({
          error: 'PARSE_ERROR',
          message: 'Erro ao processar dados de fórmulas extraídos',
          debug: stdout
        });
      }

      // Processar dados das fórmulas para formato mais amigável
      const processedFormulas = extractedData.formulasData?.inputs
        ?.filter((input: any) => input.name && ['valMin', 'valMax', 'indice', 'fatorRedutor', 'issRetidoDAS'].includes(input.name))
        ?.reduce((acc: any, input: any) => {
          if (!acc[input.name]) {
            acc[input.name] = [];
          }
          acc[input.name].push({
            value: input.value,
            type: input.type
          });
          return acc;
        }, {}) || {};

      return reply.send({
        success: true,
        message: 'Fórmulas extraídas com sucesso',
        formulas: processedFormulas,
        rawData: extractedData.formulasData,
        extractedAt: new Date().toISOString()
      });

    } catch (error: any) {
      app.log.error('Formulas extraction error:', error);
      
      return reply.status(500).send({
        error: 'EXTRACTION_ERROR',
        message: 'Erro durante a extração das fórmulas',
        details: error.message
      });
    }
  });

  // Obter tipos de serviços extraídos
  app.get('/service-types', async (request, reply) => {
    try {
      // Verificar se existe arquivo de dados extraídos
      const dataPath = path.resolve(process.cwd(), 'scripts', 'uphold-modules-exploration.json');
      
      try {
        const data = await fs.readFile(dataPath, 'utf8');
        const parsed = JSON.parse(data);
        
        const serviceTypesModule = parsed.modules?.find((m: any) => m.name === 'Tipos de Serviço');
        
        if (serviceTypesModule?.data?.tables?.[0]) {
          const table = serviceTypesModule.data.tables[0];
          const serviceTypes = table.rows.map((row: string[], index: number) => ({
            id: index + 1,
            code: row[1] || '',
            name: row[2] || '',
            issRetido: row[3] === 'Sim'
          })).filter((st: any) => st.code && st.name);

          return reply.send({
            success: true,
            serviceTypes,
            total: serviceTypes.length,
            extractedAt: parsed.explorationDate
          });
        }
      } catch (fileError) {
        return reply.status(404).send({
          error: 'DATA_NOT_FOUND',
          message: 'Dados de tipos de serviço não encontrados. Execute a extração primeiro.',
          suggestion: 'POST /api/extract-uphold-config'
        });
      }

      return reply.status(404).send({
        error: 'NO_DATA',
        message: 'Nenhum tipo de serviço encontrado nos dados extraídos'
      });

    } catch (error: any) {
      app.log.error('Service types retrieval error:', error);
      return reply.status(500).send({
        error: 'RETRIEVAL_ERROR',
        message: 'Erro ao obter tipos de serviços',
        details: error.message
      });
    }
  });

  // Obter dados de fechamento mensal
  app.get('/monthly-closures', async (request, reply) => {
    try {
      const dataPath = path.resolve(process.cwd(), 'scripts', 'uphold-modules-exploration.json');
      
      try {
        const data = await fs.readFile(dataPath, 'utf8');
        const parsed = JSON.parse(data);
        
        const closuresModule = parsed.modules?.find((m: any) => m.name === 'Fechamento Mensal');
        
        if (closuresModule?.data?.tables?.[0]) {
          const table = closuresModule.data.tables[0];
          const closures = table.rows.map((row: string[], index: number) => ({
            id: index + 1,
            cnpj: row[1] || '',
            prestador: row[2] || '',
            mes: row[3] || '',
            qtdEmissoes: row[4] || '',
            valorEmissoes: row[5] || '',
            valorFatExterno: row[6] || '',
            valorTotalMes: row[7] || '',
            aliquotaMes: row[8] || ''
          })).filter((c: any) => c.cnpj && c.prestador);

          return reply.send({
            success: true,
            closures,
            total: closures.length,
            extractedAt: parsed.explorationDate
          });
        }
      } catch (fileError) {
        return reply.status(404).send({
          error: 'DATA_NOT_FOUND',
          message: 'Dados de fechamento não encontrados. Execute a extração primeiro.',
          suggestion: 'POST /api/extract-uphold-config'
        });
      }

      return reply.status(404).send({
        error: 'NO_DATA',
        message: 'Nenhum fechamento encontrado nos dados extraídos'
      });

    } catch (error: any) {
      app.log.error('Monthly closures retrieval error:', error);
      return reply.status(500).send({
        error: 'RETRIEVAL_ERROR',
        message: 'Erro ao obter fechamentos mensais',
        details: error.message
      });
    }
  });

  // Obter administradores do sistema
  app.get('/administrators', async (request, reply) => {
    try {
      const dataPath = path.resolve(process.cwd(), 'scripts', 'uphold-modules-exploration.json');
      
      try {
        const data = await fs.readFile(dataPath, 'utf8');
        const parsed = JSON.parse(data);
        
        const adminsModule = parsed.modules?.find((m: any) => m.name === 'Administradores');
        
        if (adminsModule?.data?.tables?.[0]) {
          const table = adminsModule.data.tables[0];
          const administrators = table.rows.map((row: string[], index: number) => ({
            id: index + 1,
            name: row[1] || '',
            email: row[2] || ''
          })).filter((a: any) => a.name && a.email);

          return reply.send({
            success: true,
            administrators,
            total: administrators.length,
            extractedAt: parsed.explorationDate
          });
        }
      } catch (fileError) {
        return reply.status(404).send({
          error: 'DATA_NOT_FOUND',
          message: 'Dados de administradores não encontrados. Execute a extração primeiro.',
          suggestion: 'POST /api/extract-uphold-config'
        });
      }

      return reply.status(404).send({
        error: 'NO_DATA',
        message: 'Nenhum administrador encontrado nos dados extraídos'
      });

    } catch (error: any) {
      app.log.error('Administrators retrieval error:', error);
      return reply.status(500).send({
        error: 'RETRIEVAL_ERROR',
        message: 'Erro ao obter administradores',
        details: error.message
      });
    }
  });
}