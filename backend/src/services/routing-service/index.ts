import axios from 'axios';

export interface Point {
  lat: number;
  lng: number;
}

export interface HotspotNode {
  id: string;
  center: Point;
  risk_score: number;
  address?: string;
  priority?: number;
}

export class RouteOptimizationService {
  private mlEngineUrl = process.env.ML_ENGINE_URL || 'http://localhost:8000';

  public async getOptimizedRoute(startLocation: Point, hotspots: HotspotNode[]) {
    try {
      const response = await axios.post(`${this.mlEngineUrl}/api/v1/ml/route`, {
        start_location: this.normalizePoint(startLocation),
        hotspots: hotspots.map((hotspot) => this.normalizeHotspot(hotspot))
      });

      return this.normalizeRouteResponse(response.data);
    } catch (error: any) {
      console.error('Error optimizing route via ML Engine:', error.message);
      return this.fallbackRoute(startLocation, hotspots);
    }
  }

  public async adjustRouteDynamically(currentRoute: any, newIncident: any, currentPosition: Point) {
    if (newIncident.severity >= 8) {
      console.log('High priority incident detected, recalculating route...');
      const updatedHotspots = [
        { id: newIncident.id, center: { lat: newIncident.location.coordinates[1], lng: newIncident.location.coordinates[0] }, risk_score: 100 },
      ];
      return this.getOptimizedRoute(currentPosition, updatedHotspots);
    }

    return currentRoute;
  }

  private normalizePoint(point: any): Point {
    if (typeof point?.lat === 'number' && typeof point?.lng === 'number') {
      return { lat: point.lat, lng: point.lng };
    }

    const address = String(point?.address || point?.name || '0,0');
    return this.pointFromString(address);
  }

  private normalizeHotspot(hotspot: any): HotspotNode {
    const center = hotspot.center || this.pointFromString(String(hotspot.address || hotspot.id || 'hotspot'));
    return {
      id: String(hotspot.id || hotspot.address || 'hotspot'),
      center,
      risk_score: Number(hotspot.risk_score ?? hotspot.priority ?? hotspot.severity ?? 0),
      address: hotspot.address,
      priority: hotspot.priority
    };
  }

  private normalizeRouteResponse(data: any) {
    const optimizedPath = data.optimized_path || data.waypoints || [];
    const totalDistance = data.total_distance ?? data.distance_km ?? 0;

    return {
      ...data,
      optimized_path: optimizedPath,
      waypoints: data.waypoints || optimizedPath,
      total_distance: totalDistance,
      distance_km: data.distance_km ?? totalDistance
    };
  }

  private fallbackRoute(startLocation: Point, hotspots: HotspotNode[]) {
    const ordered = [...hotspots].sort((a, b) => b.risk_score - a.risk_score);
    const optimized_path = [
      { lat: startLocation.lat, lng: startLocation.lng },
      ...ordered.map((hotspot) => ({ lat: hotspot.center.lat, lng: hotspot.center.lng })),
      { lat: startLocation.lat, lng: startLocation.lng }
    ];

    const totalDistance = Math.max(optimized_path.length - 1, 0) * 1.5;

    return {
      optimized_path,
      waypoints: optimized_path,
      total_distance: totalDistance,
      distance_km: totalDistance,
      estimated_mins: Math.max(optimized_path.length - 1, 0) * 3
    };
  }

  private pointFromString(input: string): Point {
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
    }

    const lat = ((hash % 1800000) / 10000) - 90;
    const lng = (((Math.floor(hash / 1800000)) % 3600000) / 10000) - 180;
    return {
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6))
    };
  }
}
