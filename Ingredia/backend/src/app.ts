import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { ENV } from './config/env.js';
import { connectDB } from './config/db.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(ENV.FRONTEND_URL ? ENV.FRONTEND_URL.split(',').map((s) => s.trim()) : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        ENV.NODE_ENV !== 'production'
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads (for review images, etc.)
app.use('/storage', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint (matches Laravel's /up)
app.get('/up', (_req, res) => {
  res.status(200).send('OK');
});

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  await connectDB();
  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`[Ingredia Node Backend] Running on http://0.0.0.0:${ENV.PORT}`);
    console.log(`[Ingredia Node Backend] Health check: http://0.0.0.0:${ENV.PORT}/up`);
  });
};

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

export default app;

