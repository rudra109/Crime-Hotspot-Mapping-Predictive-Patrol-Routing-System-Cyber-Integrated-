import { Router } from 'express';
import {
  getDailyTrends,
  getHotspotPredictions,
  getSeasonalTrends,
  getSourceBreakdown,
  getZoneRiskScores
} from '../controllers/analyticsController';

const router = Router();

router.get('/sources', getSourceBreakdown);
router.get('/daily-trends', getDailyTrends);
router.get('/seasonal-trends', getSeasonalTrends);
router.get('/zones/risk', getZoneRiskScores);
router.get('/hotspots', getHotspotPredictions);

export default router;
