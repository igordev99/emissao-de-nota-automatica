import { buildApp } from './app';
import { setAppLive, setAppReadiness } from './infra/observability/metrics';
// import { retryService } from './modules/jobs'; // Temporarily disabled

const start = async () => {
  const app = await buildApp();
  const port = Number(process.env.PORT || 3000);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`NFSe service listening on ${port}`);
    // Mark liveness after the server is actually listening
    setAppLive(true);

    // Start retry service
    // await retryService.start(); // Temporarily disabled
  } catch (err) {
    if ((err as any)?.code === 'EADDRINUSE') {
      app.log.error({ err }, `Porta ${port} ocupada (EADDRINUSE). Dica: execute 'npm run port:free' e tente novamente, ou use 'npm run dev:win:start' para iniciar com liberação automática.`);
    } else {
      app.log.error(err, 'Error starting server');
    }
    process.exit(1);
  }

  // Graceful shutdown handling
  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, 'Shutting down gracefully...');
    // Flip readiness first to stop traffic from LB
    setAppReadiness(false);
    setAppLive(false);

    // Stop retry service
    // await retryService.stop(); // Temporarily disabled

    const timeoutMs = 10000; // 10s timeout to force exit
    try {
      await Promise.race([
        app.close(),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('shutdown_timeout')), timeoutMs))
      ]);
      app.log.info('Server closed gracefully');
      process.exit(0);
    } catch (e) {
      app.log.error({ err: e }, 'Force exiting after shutdown timeout');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
};

start();
