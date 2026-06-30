import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import express from 'express';
import app from './api/app';

const PORT = Number(process.env.PORT) || 3000;
const distPath = path.join(process.cwd(), 'dist');
const isProduction =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RAILWAY_ENVIRONMENT) ||
  fs.existsSync(path.join(distPath, 'index.html'));

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
