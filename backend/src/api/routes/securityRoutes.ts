import { Router } from 'express';
import { getSecurityStatus, getSecurityMetrics } from '../controllers/securityController';

const router = Router();

// Security dashboard overview endpoints
router.get('/status', getSecurityStatus);
router.get('/metrics', getSecurityMetrics);

export default router;
