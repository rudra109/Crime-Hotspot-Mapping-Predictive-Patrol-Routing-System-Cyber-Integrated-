import { Router } from 'express';
import {
  getVehiclePositions,
  pushVehiclePosition,
  getConstraints,
  upsertConstraint,
  toggleConstraint,
  assignRoute,
  getAllRoutes,
  getVehicleRoute,
  acknowledgeRoute,
  getAllAcknowledgments,
  progressRoute,
} from '../controllers/patrolController';

const router = Router();

// Vehicle GPS
router.get('/vehicles', getVehiclePositions);
router.post('/vehicles/:id/position', pushVehiclePosition);
router.get('/vehicles/:id/route', getVehicleRoute);
router.post('/vehicles/:id/progress', progressRoute);

// Constraints
router.get('/constraints', getConstraints);
router.post('/constraints', upsertConstraint);
router.patch('/constraints/:id/toggle', toggleConstraint);

// Routes
router.post('/routes/assign', assignRoute);
router.get('/routes', getAllRoutes);
router.post('/routes/:routeId/acknowledge', acknowledgeRoute);
router.get('/acknowledgments', getAllAcknowledgments);

export default router;
