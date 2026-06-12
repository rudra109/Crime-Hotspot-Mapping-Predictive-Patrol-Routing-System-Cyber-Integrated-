import { Router } from 'express';
import { sosAlert, trafficAlert, streetlightAlert } from '../controllers/smartCityController';

const router = Router();

router.post('/sos', sosAlert);
router.post('/traffic', trafficAlert);
router.post('/streetlight', streetlightAlert);

export default router;
