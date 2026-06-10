import numpy as np
from sklearn.cluster import DBSCAN
from pydantic import BaseModel
from typing import List

class Point(BaseModel):
    lat: float
    lng: float

class Crime(BaseModel):
    id: str
    type: str
    severity: int
    location: Point

class Hotspot(BaseModel):
    cluster_id: int
    center: Point
    incident_count: int
    avg_severity: float

class CrimeClustering:
    def __init__(self, eps_meters=500, min_samples=3):
        self.eps = eps_meters / 111000  # Approx convert to degrees
        self.min_samples = min_samples
    
    def cluster_crimes(self, crimes: List[Crime]) -> List[Hotspot]:
        if not crimes:
            return []
            
        X = np.array([[c.location.lat, c.location.lng] for c in crimes])
        
        clustering = DBSCAN(eps=self.eps, min_samples=self.min_samples).fit(X)
        labels = clustering.labels_
        
        hotspots = []
        for cluster_id in set(labels):
            if cluster_id == -1:  # Noise
                continue
            
            cluster_crimes = [c for c, l in zip(crimes, labels) if l == cluster_id]
            
            lats = [c.location.lat for c in cluster_crimes]
            lngs = [c.location.lng for c in cluster_crimes]
            centroid = Point(lat=np.mean(lats), lng=np.mean(lngs))
            avg_severity = np.mean([c.severity for c in cluster_crimes])
            
            hotspots.append(Hotspot(
                cluster_id=int(cluster_id),
                center=centroid,
                incident_count=len(cluster_crimes),
                avg_severity=float(avg_severity)
            ))
            
        return hotspots
