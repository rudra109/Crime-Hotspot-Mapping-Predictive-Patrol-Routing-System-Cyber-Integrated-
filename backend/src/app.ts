import express from 'express';
import cors from 'cors';
import crimeRoutes from './api/routes/crimeRoutes';
import statsRoutes from './api/routes/statsRoutes';
import routingRoutes from './api/routes/routingRoutes';
import auditRoutes from './api/routes/auditRoutes';
import analyticsRoutes from './api/routes/analyticsRoutes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/crimes', crimeRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/routing', routingRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// Healthcheck Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
