import { Router } from 'express';
import { optimizePatrolRoute } from '../controllers/routingController';

const router = Router();

router.post('/optimize', optimizePatrolRoute);

export default router;
