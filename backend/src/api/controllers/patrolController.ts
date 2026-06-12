import { Request, Response } from 'express';
import { patrolService } from '../../services/patrol-service';
import { auditService } from '../../services/audit-service';
import { emitRouteOptimized } from '../../services/realtime';

/** GET /api/v1/patrol/vehicles — All live vehicle positions */
export const getVehiclePositions = async (req: Request, res: Response) => {
  try {
    const vehicles = patrolService.getVehiclePositions();
    return res.json({ vehicles });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** POST /api/v1/patrol/vehicles/:id/position — Push GPS position from device */
export const pushVehiclePosition = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const pos = { ...req.body, vehicleId: id };
    const updated = patrolService.updateVehiclePosition(pos);
    return res.json({ position: updated });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** GET /api/v1/patrol/constraints — Get all route constraints */
export const getConstraints = async (req: Request, res: Response) => {
  try {
    const constraints = patrolService.getConstraints();
    return res.json({ constraints });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** POST /api/v1/patrol/constraints — Create or update a constraint */
export const upsertConstraint = async (req: Request, res: Response) => {
  try {
    const constraint = req.body;
    if (!constraint.id) constraint.id = `rc-${Date.now()}`;
    const saved = patrolService.upsertConstraint(constraint);
    await auditService.record({ action: 'patrol.constraint.upsert', resource: 'route_constraints', changes: { id: saved.id, type: saved.type } });
    return res.json({ constraint: saved });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** PATCH /api/v1/patrol/constraints/:id/toggle — Toggle constraint active */
export const toggleConstraint = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    const constraint = patrolService.toggleConstraint(id, active);
    if (!constraint) return res.status(404).json({ error: 'Constraint not found' });
    return res.json({ constraint });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** POST /api/v1/patrol/routes/assign — Assign a route to a vehicle */
export const assignRoute = async (req: Request, res: Response) => {
  try {
    const { vehicleId, waypoints, distanceKm, estimatedMins, priority } = req.body;
    if (!vehicleId || !waypoints) return res.status(400).json({ error: 'vehicleId and waypoints required' });
    const route = patrolService.assignRoute(vehicleId, waypoints, distanceKm || 0, estimatedMins || 0, priority || 'normal');
    await auditService.record({
      action: 'patrol.route.assign',
      resource: 'patrol_routes',
      changes: { vehicleId, routeId: route.routeId, waypointCount: waypoints.length }
    });
    emitRouteOptimized({ type: 'route_assigned', route });
    return res.json({ route });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** GET /api/v1/patrol/routes — All routes */
export const getAllRoutes = async (req: Request, res: Response) => {
  try {
    const routes = patrolService.getAllRoutes();
    return res.json({ routes });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** GET /api/v1/patrol/vehicles/:id/route — Get vehicle's current route */
export const getVehicleRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = patrolService.getVehicleRoute(id);
    return res.json({ route });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** POST /api/v1/patrol/routes/:routeId/acknowledge — Officer acks/rejects route */
export const acknowledgeRoute = async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    const { vehicleId, accepted, note, rejectionReason } = req.body;
    const ack = patrolService.acknowledgeRoute(vehicleId, routeId, accepted, note, rejectionReason);
    emitRouteOptimized({ type: 'route_acknowledged', vehicleId, routeId, accepted });
    return res.json({ acknowledgment: ack });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** GET /api/v1/patrol/acknowledgments — All acknowledgments */
export const getAllAcknowledgments = async (req: Request, res: Response) => {
  try {
    const acknowledgments = patrolService.getAllAcknowledgments();
    return res.json({ acknowledgments });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

/** POST /api/v1/patrol/vehicles/:id/progress — Advance vehicle to next waypoint */
export const progressRoute = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const route = patrolService.progressVehicleRoute(id);
    if (!route) return res.status(404).json({ error: 'No active route for this vehicle' });
    emitRouteOptimized({ type: 'route_progress', vehicleId: id, routeId: route.routeId, waypointIndex: route.currentWaypointIndex });
    return res.json({ route });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
