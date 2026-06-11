import { Router } from 'express';
import { ingestCrimes, ingestFir, ingestComplaint, ingestPatrol, ingestCyber, getCrimes } from '../controllers/crimeController';

const router = Router();

router.post('/ingest', ingestCrimes);
router.post('/ingest/fir', ingestFir);
router.post('/ingest/complaints', ingestComplaint);
router.post('/ingest/patrol-logs', ingestPatrol);
router.post('/ingest/cyber-branch', ingestCyber);
router.get('/', getCrimes);

export default router;
