import math
from typing import List, Dict, Any
from ortools.linear_solver import pywraplp
from pydantic import BaseModel

class Point(BaseModel):
    lat: float
    lng: float

class HotspotNode(BaseModel):
    id: str
    center: Point
    risk_score: float

class PatrolRouteOptimizer:
    def __init__(self, max_distance_km=50, time_limit_secs=5):
        self.max_distance = max_distance_km * 1000
        self.time_limit = time_limit_secs

    def _haversine_distance(self, p1: Point, p2: Point) -> float:
        R = 6371e3 # Earth radius in meters
        phi1 = math.radians(p1.lat)
        phi2 = math.radians(p2.lat)
        delta_phi = math.radians(p2.lat - p1.lat)
        delta_lambda = math.radians(p2.lng - p1.lng)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        return R * c

    def optimize_route(self, start_location: Point, hotspots: List[HotspotNode]) -> Dict[str, Any]:
        """
        Simplified TSP using OR-Tools Routing API or basic Linear Programming.
        To avoid complex callback setups, we use a nearest-neighbor heuristic combined with high-risk priority 
        in this simplified implementation.
        """
        if not hotspots:
            return {
                "optimized_path": [{"lat": start_location.lat, "lng": start_location.lng}],
                "waypoints": [{"lat": start_location.lat, "lng": start_location.lng}],
                "distance_km": 0,
                "total_distance": 0,
                "estimated_mins": 0,
            }

        # Sort hotspots by risk score descending for priority
        sorted_hotspots = sorted(hotspots, key=lambda x: x.risk_score, reverse=True)

        current_loc = start_location
        route = [{"lat": start_location.lat, "lng": start_location.lng}]
        total_distance = 0.0

        for hotspot in sorted_hotspots:
            dist = self._haversine_distance(current_loc, hotspot.center)
            if total_distance + dist > self.max_distance:
                break # Reached max distance
            
            route.append({"lat": hotspot.center.lat, "lng": hotspot.center.lng})
            total_distance += dist
            current_loc = hotspot.center

        # Return to start
        final_dist = self._haversine_distance(current_loc, start_location)
        route.append({"lat": start_location.lat, "lng": start_location.lng})
        total_distance += final_dist

        return {
            "optimized_path": route,
            "waypoints": route,
            "distance_km": total_distance / 1000,
            "total_distance": total_distance / 1000,
            "estimated_mins": int((total_distance / 1000) / 40 * 60) # 40km/h
        }
