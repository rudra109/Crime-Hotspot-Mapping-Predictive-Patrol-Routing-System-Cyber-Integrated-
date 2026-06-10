import { Router } from 'express';
import { ingestCrimes, getCrimes } from '../controllers/crimeController';

const router = Router();

router.post('/ingest', ingestCrimes);
router.get('/', getCrimes);

export default router;
