import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import { createRequire } from 'module';
const requireModule = createRequire(import.meta.url);

const { buildApp } = requireModule('../dist/app.cjs');

let cachedApp = null;

export default async function handler(req, res) {
  if (!cachedApp) {
    try {
      cachedApp = await buildApp();
      await cachedApp.ready();
    } catch (error) {
      console.error('Failed to build app:', error);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
  }

  try {
    await cachedApp.inject({
      method: req.method,
      url: req.url,
      headers: req.headers,
      payload: req.body,
      remoteAddress: req.ip || req.connection?.remoteAddress
    }).then(response => {
      // Set status code
      res.status(response.statusCode);
      
      // Set headers
      Object.entries(response.headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });
      
      // Send response
      res.end(response.body);
    });
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}