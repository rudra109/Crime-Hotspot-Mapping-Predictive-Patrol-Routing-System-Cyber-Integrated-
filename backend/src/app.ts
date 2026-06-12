import express from 'express';
import cors from 'cors';
import crimeRoutes from './api/routes/crimeRoutes';
import statsRoutes from './api/routes/statsRoutes';
import routingRoutes from './api/routes/routingRoutes';
import auditRoutes from './api/routes/auditRoutes';
import analyticsRoutes from './api/routes/analyticsRoutes';
import connectorRoutes from './api/routes/connectorRoutes';
import patrolRoutes from './api/routes/patrolRoutes';
import cyberRoutes from './api/routes/cyberRoutes';
import alertRoutes from './api/routes/alertRoutes';
import decisionRoutes from './api/routes/decisionRoutes';
import authRoutes from './api/routes/authRoutes';
import complianceRoutes from './api/routes/complianceRoutes';
import anomalyRoutes from './api/routes/anomalyRoutes';
import smartCityRoutes from './api/routes/smartCityRoutes';
import { accessAuditor } from './api/middleware/auth-middleware';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(accessAuditor);

// Routes
app.use('/api/v1/crimes', crimeRoutes);
app.use('/api/v1/stats', statsRoutes);
app.use('/api/v1/routing', routingRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/connectors', connectorRoutes);
app.use('/api/v1/patrol', patrolRoutes);
app.use('/api/v1/cyber', cyberRoutes);
app.use('/api/v1/alerts', alertRoutes);
app.use('/api/v1/decision', decisionRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/analytics/anomalies', anomalyRoutes);
app.use('/api/v1/smartcity', smartCityRoutes);

// Healthcheck Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
