import { buildApp } from './app';
import { setAppLive, setAppReadiness } from './infra/observability/metrics';

const start = async () => {
  const app = await buildApp();
  const port = Number(process.env.PORT || 3000);
  try {
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`NFSe service listening on ${port}`);
    // Mark liveness after the server is actually listening
    setAppLive(true);
  } catch (err) {
    app.log.error(err, 'Error starting server');
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
