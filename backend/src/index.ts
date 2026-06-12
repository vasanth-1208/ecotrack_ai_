import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

// Load Environment Variables
dotenv.config();

import router from './routes';
import { dbClient } from './repositories/dbClient';
import { apiLimiter, authLimiter } from './middleware/rateLimitMiddleware';
import { errorHandler } from './middleware/errorMiddleware';

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Allow all origins for convenience in full-stack local runs
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Apply Rate Limiters
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

// ==========================================
// SWAGGER UI DOCUMENTATION SETUP
// ==========================================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EcoTrack AI API Documentation',
      version: '1.0.0',
      description: 'API services powering EcoTrack AI carbon footprints, goals, challenges, and AI coach.',
      contact: {
        name: 'EcoTrack AI Developer Support',
      }
    },
    servers: [
      {
        url: `http://localhost:${PORT}/api`,
        description: 'Local development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js', './src/index.ts', './dist/index.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mount Api Router
app.use('/api', router);

// Swagger Documentation Redirection for Root path
app.get('/', (_req, res) => {
  res.redirect('/api-docs');
});

// Global Error Handler
app.use(errorHandler);

// Initialize Database Schema on startup (non-blocking)
if (process.env.NODE_ENV !== 'test') {
  dbClient.initDbSchema().catch(err => {
    console.error('Failed to initialize database schema:', err);
  });
}

// Start Express Server only when running locally (not on Vercel) and not in test environment
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 EcoTrack AI Backend API is running on http://localhost:${PORT}`);
    console.log(`📖 Swagger API Docs available at http://localhost:${PORT}/api-docs`);
  });
}

export default app;
