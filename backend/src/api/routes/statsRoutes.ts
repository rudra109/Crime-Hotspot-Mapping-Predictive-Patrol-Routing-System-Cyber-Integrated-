import { Router } from 'express';
import { getSummaryStats, getHourlyStats } from '../controllers/statsController';

const router = Router();

router.get('/summary', getSummaryStats);
router.get('/hourly', getHourlyStats);

export default router;
