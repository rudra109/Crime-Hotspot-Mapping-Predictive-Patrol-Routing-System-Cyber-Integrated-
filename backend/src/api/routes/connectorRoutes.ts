import { Router } from 'express';
import {
  ingestFIRConnector,
  ingestComplaintConnector,
  ingestPatrolConnector,
  ingestCyberConnector,
  getConnectorStatus,
  getFailureQueue,
  clearFailureQueue,
  getRetryQueue
} from '../controllers/connectorController';

const router = Router();

// ── Connector Ingest Endpoints ──────────────────────────────
// POST: Accept real upstream payloads from their respective systems

// FIR Database → accepts RawFIRPayload[] or single RawFIRPayload
router.post('/fir', ingestFIRConnector);

// Complaint System → accepts RawComplaintPayload[] or single
router.post('/complaint', ingestComplaintConnector);

// Patrol Log System → accepts RawPatrolLogPayload[] or single
router.post('/patrol', ingestPatrolConnector);

// Cyber Crime Branch → accepts RawCyberCrimePayload[] or single
router.post('/cyber', ingestCyberConnector);

// ── Status & Monitoring ──────────────────────────────────────
router.get('/status', getConnectorStatus);

// Failure queue: records that permanently failed
router.get('/failures', getFailureQueue);
router.delete('/failures', clearFailureQueue);

// Retry queue: records pending retry
router.get('/retries', getRetryQueue);

export default router;
