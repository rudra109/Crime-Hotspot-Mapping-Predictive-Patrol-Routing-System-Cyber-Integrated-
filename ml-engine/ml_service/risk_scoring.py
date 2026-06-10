from pydantic import BaseModel
from typing import List, Dict

class GridCell(BaseModel):
    id: str
    lat: float
    lng: float

class RiskScore(BaseModel):
    score: float
    confidence: float
    breakdown: Dict[str, float]

class RiskScoring:
    def calculate_grid_risk(self,
                            grid_cell: GridCell,
                            historical_density: float,
                            predicted_count: float,
                            anomaly_score: float,
                            correlation_count: int) -> RiskScore:
        """
        Ensemble risk score combining multiple metrics for a grid cell.
        """
        
        # Historical density (0-100)
        max_hist_expected = 50
        hist_score = min((historical_density / max_hist_expected) * 100, 100)
        
        # Temporal forecast (0-100)
        max_pred_expected = 10
        temp_score = min((predicted_count / max_pred_expected) * 100, 100)
        
        # Anomalies (0-100)
        anom_score = min(anomaly_score * 100, 100)
        
        # Correlations (0-100)
        corr_score = min(correlation_count * 10, 100)
        
        # Ensemble weights
        final_score = (
            0.30 * hist_score +
            0.30 * temp_score +
            0.20 * anom_score +
            0.20 * corr_score
        )
        
        # Confidence calculation
        scores = [hist_score, temp_score, anom_score, corr_score]
        valid_scores = [s for s in scores if s > 0]
        confidence = len(valid_scores) / 4.0
        
        return RiskScore(
            score=final_score,
            confidence=confidence,
            breakdown={
                'historical': hist_score,
                'temporal': temp_score,
                'anomaly': anom_score,
                'correlation': corr_score
            }
        )
