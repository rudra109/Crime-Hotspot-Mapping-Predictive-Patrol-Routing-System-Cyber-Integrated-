import { Request, Response } from 'express';
import { RouteOptimizationService } from '../../services/routing-service';
import { auditService } from '../../services/audit-service';
import { emitRouteOptimized } from '../../services/realtime';

const routeOptimizer = new RouteOptimizationService();

export const optimizePatrolRoute = async (req: Request, res: Response) => {
  try {
    const { startLocation, hotspots } = req.body;
    
    if (!startLocation || !hotspots) {
      return res.status(400).json({ error: 'startLocation and hotspots are required' });
    }

    const optimizedData = await routeOptimizer.getOptimizedRoute(startLocation, hotspots);
    await auditService.record({
      action: 'route.optimize',
      resource: 'patrol_routes',
      changes: {
        hotspotCount: Array.isArray(hotspots) ? hotspots.length : 0,
        totalDistance: optimizedData.total_distance ?? optimizedData.distance_km ?? 0
      }
    });
    emitRouteOptimized(optimizedData);
    
    return res.status(200).json(optimizedData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
