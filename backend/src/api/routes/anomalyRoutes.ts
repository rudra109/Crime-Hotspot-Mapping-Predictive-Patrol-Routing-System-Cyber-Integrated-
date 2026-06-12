import { Router } from 'express';
import { getAnomalies, runCheck } from '../controllers/anomalyController';

const router = Router();

router.get('/', getAnomalies);
router.post('/check', runCheck);

export default router;
