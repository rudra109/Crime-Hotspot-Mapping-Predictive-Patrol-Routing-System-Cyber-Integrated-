import { Router } from 'express';
import {
  getDailyTrends,
  getHotspotPredictions,
  getSeasonalTrends,
  getSourceBreakdown,
  getZoneRiskScores,
  getForecast,
  runRetraining,
  getModelMonitoring,
  getPredictionHistory,
  syncActualOutcomes
} from '../controllers/analyticsController';

const router = Router();

router.get('/sources', getSourceBreakdown);
router.get('/daily-trends', getDailyTrends);
router.get('/seasonal-trends', getSeasonalTrends);
router.get('/zones/risk', getZoneRiskScores);
router.get('/hotspots', getHotspotPredictions);

// Predictive analytics endpoints
router.get('/predict/forecast', getForecast);
router.post('/predict/retrain', runRetraining);
router.get('/predict/monitoring', getModelMonitoring);
router.get('/predict/history', getPredictionHistory);
router.post('/predict/sync', syncActualOutcomes);

export default router;
