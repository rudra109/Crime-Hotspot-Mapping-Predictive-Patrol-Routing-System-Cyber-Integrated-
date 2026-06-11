from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import hashlib
import pandas as pd
from ml_service.clustering import CrimeClustering, Crime, Hotspot
from ml_service.temporal_forecasting import TemporalForecasting
from ml_service.risk_scoring import RiskScoring, GridCell, RiskScore
from routing_service.optimizer import PatrolRouteOptimizer, Point, HotspotNode

app = FastAPI(title="Crime Hotspot ML Engine")
clustering_service = CrimeClustering()
routing_optimizer = PatrolRouteOptimizer()
forecasting_service = TemporalForecasting()
risk_scoring_service = RiskScoring()

class ClusterRequest(BaseModel):
    crimes: List[Crime]

class ClusterResponse(BaseModel):
    hotspots: List[Hotspot]

class FlexiblePoint(BaseModel):
    lat: Optional[float] = None
    lng: Optional[float] = None
    address: Optional[str] = None

class FlexibleHotspot(BaseModel):
    id: Optional[str] = None
    center: Optional[FlexiblePoint] = None
    risk_score: Optional[float] = None
    address: Optional[str] = None
    priority: Optional[float] = None

class RouteRequest(BaseModel):
    start_location: FlexiblePoint
    hotspots: List[FlexibleHotspot]

class ForecastPoint(BaseModel):
    timestamp: str
    incident_count: int

class ForecastRequest(BaseModel):
    history: List[ForecastPoint]

class AnomalyRequest(BaseModel):
    history: List[ForecastPoint]

class RiskCellRequest(BaseModel):
    id: str
    lat: float
    lng: float
    historical_density: float
    predicted_count: float
    anomaly_score: float
    correlation_count: int = 0

class RiskRequest(BaseModel):
    cells: List[RiskCellRequest]

class RiskCellResponse(BaseModel):
    id: str
    lat: float
    lng: float
    score: float
    confidence: float
    breakdown: Dict[str, float]

class RiskResponse(BaseModel):
    scores: List[RiskCellResponse]

def _point_from_string(input_value: str) -> Point:
    digest = hashlib.sha256(input_value.encode("utf-8")).digest()
    lat_raw = int.from_bytes(digest[:4], "big")
    lng_raw = int.from_bytes(digest[4:8], "big")
    return Point(
        lat=((lat_raw % 1800000) / 10000.0) - 90.0,
        lng=((lng_raw % 3600000) / 10000.0) - 180.0,
    )

def _normalize_point(point: FlexiblePoint | Point | Dict[str, Any]) -> Point:
    if isinstance(point, Point):
        return point

    lat = getattr(point, "lat", None) if not isinstance(point, dict) else point.get("lat")
    lng = getattr(point, "lng", None) if not isinstance(point, dict) else point.get("lng")
    address = getattr(point, "address", None) if not isinstance(point, dict) else point.get("address")

    if lat is not None and lng is not None:
        return Point(lat=float(lat), lng=float(lng))

    return _point_from_string(str(address or "0,0"))

def _normalize_hotspot(hotspot: FlexibleHotspot | HotspotNode | Dict[str, Any]) -> HotspotNode:
    if isinstance(hotspot, HotspotNode):
        return hotspot

    data = hotspot if isinstance(hotspot, dict) else hotspot.model_dump()
    center_data = data.get("center")
    center = _normalize_point(center_data) if center_data else _normalize_point(data)
    return HotspotNode(
        id=str(data.get("id") or data.get("address") or "hotspot"),
        center=center,
        risk_score=float(data.get("risk_score") or data.get("priority") or data.get("severity") or 0),
    )

@app.post("/api/v1/ml/cluster", response_model=ClusterResponse)
def cluster_data(req: ClusterRequest):
    try:
        hotspots = clustering_service.cluster_crimes(req.crimes)
        return ClusterResponse(hotspots=hotspots)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/route")
def calculate_route(req: RouteRequest):
    try:
        start_location = _normalize_point(req.start_location)
        hotspots = [_normalize_hotspot(hotspot) for hotspot in req.hotspots]
        route = routing_optimizer.optimize_route(start_location, hotspots)
        optimized_path = route.get("optimized_path") or route.get("waypoints") or []
        total_distance = route.get("total_distance") or route.get("distance_km") or 0
        return {
            **route,
            "optimized_path": optimized_path,
            "waypoints": route.get("waypoints") or optimized_path,
            "total_distance": total_distance,
            "distance_km": route.get("distance_km") or total_distance,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/forecast")
def forecast_incidents(req: ForecastRequest):
    try:
        if not req.history:
            return {"forecast": []}

        history = pd.DataFrame([item.model_dump() for item in req.history])
        forecast = forecasting_service.forecast_by_hour(history)
        if forecast.empty:
          return {"forecast": []}

        return {
            "forecast": [
                {
                    "timestamp": row["ds"].isoformat() if hasattr(row["ds"], "isoformat") else str(row["ds"]),
                    "predicted_incidents": float(row["yhat"]),
                    "lower_bound": float(row["yhat_lower"]),
                    "upper_bound": float(row["yhat_upper"]),
                }
                for _, row in forecast.iterrows()
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/anomalies")
def detect_anomalies(req: AnomalyRequest):
    try:
        if not req.history:
            return {"anomalies": []}

        history = pd.DataFrame([item.model_dump() for item in req.history])
        anomalies = forecasting_service.detect_anomalies(history)
        return {
            "anomalies": [anomaly.model_dump() for anomaly in anomalies]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/risk-zones", response_model=RiskResponse)
def score_risk_zones(req: RiskRequest):
    try:
        scores = []
        for cell in req.cells:
            risk = risk_scoring_service.calculate_grid_risk(
                GridCell(id=cell.id, lat=cell.lat, lng=cell.lng),
                historical_density=cell.historical_density,
                predicted_count=cell.predicted_count,
                anomaly_score=cell.anomaly_score,
                correlation_count=cell.correlation_count,
            )
            scores.append(
                RiskCellResponse(
                    id=cell.id,
                    lat=cell.lat,
                    lng=cell.lng,
                    score=risk.score,
                    confidence=risk.confidence,
                    breakdown=risk.breakdown,
                )
            )
        return RiskResponse(scores=scores)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/v1/ml/predict-hotspots")
def predict_hotspots(req: ClusterRequest):
    try:
        hotspots = clustering_service.cluster_crimes(req.crimes)
        if not hotspots:
            return {"hotspots": []}

        prediction_rows = []
        for hotspot in hotspots:
            risk = risk_scoring_service.calculate_grid_risk(
                GridCell(
                    id=f"cluster-{hotspot.cluster_id}",
                    lat=hotspot.center.lat,
                    lng=hotspot.center.lng,
                ),
                historical_density=float(hotspot.incident_count),
                predicted_count=float(hotspot.incident_count) * 1.15,
                anomaly_score=min(max(hotspot.avg_severity / 10.0, 0.0), 1.0),
                correlation_count=max(1, int(hotspot.avg_severity // 3)),
            )
            prediction_rows.append({
                "cluster_id": hotspot.cluster_id,
                "center": hotspot.center.model_dump(),
                "incident_count": hotspot.incident_count,
                "avg_severity": hotspot.avg_severity,
                "risk_score": risk.score,
                "confidence": risk.confidence,
                "breakdown": risk.breakdown,
            })

        prediction_rows.sort(key=lambda row: row["risk_score"], reverse=True)
        return {"hotspots": prediction_rows}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
def health_check():
    return {"status": "ok"}
