import { Router } from 'express';
import {
  getProfiles,
  runSimulation,
  calculateResourcePlan,
  getPatrolEfficiencyMetrics,
  applyDecisionStrategy
} from '../controllers/decisionController';

const router = Router();

router.get('/profiles', getProfiles);
router.post('/simulate', runSimulation);
router.post('/plan', calculateResourcePlan);
router.get('/metrics', getPatrolEfficiencyMetrics);
router.post('/apply', applyDecisionStrategy);

export default router;
