import { Router } from 'express';
import { authenticateJwt, requireRole } from '../middleware/auth-middleware';
import {
  getLegalHolds,
  addLegalHold,
  removeLegalHold,
  getRetention,
  setRetention,
  runPruning
} from '../controllers/complianceController';

const router = Router();

// Secure all compliance endpoints
router.use(authenticateJwt);

router.get('/holds', getLegalHolds);
router.post('/holds', requireRole(['supervisor']), addLegalHold);
router.delete('/holds/:id', requireRole(['supervisor']), removeLegalHold);

router.get('/retention', getRetention);
router.post('/retention', requireRole(['supervisor']), setRetention);
router.post('/prune', requireRole(['supervisor']), runPruning);

export default router;
