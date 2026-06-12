import { Router } from 'express';
import {
  getCyberOverview,
  getCyberIncidents,
  getCyberClusters,
  getCyberAlerts,
  getCyberCorrelations,
  getCyberZones,
} from '../controllers/cyberController';

const router = Router();

router.get('/overview', getCyberOverview);
router.get('/incidents', getCyberIncidents);
router.get('/clusters', getCyberClusters);
router.get('/alerts', getCyberAlerts);
router.get('/correlations', getCyberCorrelations);
router.get('/zones', getCyberZones);

export default router;
