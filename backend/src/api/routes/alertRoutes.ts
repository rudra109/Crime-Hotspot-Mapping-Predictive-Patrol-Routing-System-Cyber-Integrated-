import { Router } from 'express';
import {
  getAlerts,
  createAlert,
  acknowledgeAlert,
  escalateAlert,
  getAlertHistory,
  ingest112Call,
  get112Logs,
} from '../controllers/alertController';

const router = Router();

router.get('/', getAlerts);
router.post('/', createAlert);
router.post('/:id/acknowledge', acknowledgeAlert);
router.post('/:id/escalate', escalateAlert);
router.get('/:id/history', getAlertHistory);
router.post('/connectors/112', ingest112Call);
router.get('/connectors/112/logs', get112Logs);

export default router;
