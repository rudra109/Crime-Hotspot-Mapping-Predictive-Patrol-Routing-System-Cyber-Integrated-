import pandas as pd
from prophet import Prophet
from typing import List
from pydantic import BaseModel

class Anomaly(BaseModel):
    timestamp: str
    expected: float
    actual: float
    severity: float

class TemporalForecasting:
    def forecast_by_hour(self, crime_history: pd.DataFrame) -> pd.DataFrame:
        """
        Forecast crime incidents by hour for the next 24 hours.
        Expects DataFrame with columns: 'timestamp', 'incident_count'
        """
        if crime_history.empty:
            return pd.DataFrame()
            
        df = crime_history.copy()
        df.rename(columns={'timestamp': 'ds', 'incident_count': 'y'}, inplace=True)
        
        # Train Prophet model
        model = Prophet(
            yearly_seasonality=False,
            weekly_seasonality=True,
            daily_seasonality=True,
            interval_width=0.95
        )
        
        model.fit(df)
        
        # Forecast next 24 hours
        future = model.make_future_dataframe(periods=24, freq='H')
        forecast = model.predict(future)
        
        forecast_future = forecast[forecast['ds'] > df['ds'].max()][
            ['ds', 'yhat', 'yhat_lower', 'yhat_upper']
        ]
        
        return forecast_future
        
    def detect_anomalies(self, crime_history: pd.DataFrame) -> List[Anomaly]:
        if len(crime_history) < 24:
            return []
            
        df = crime_history.copy()
        df['ma'] = df['incident_count'].rolling(window=24).mean()
        df['std'] = df['incident_count'].rolling(window=24).std()
        
        # Anomaly threshold: > 2 standard deviations
        df['anomaly'] = (df['incident_count'] > df['ma'] + 2 * df['std'])
        
        anomalies = []
        for idx, row in df[df['anomaly']].iterrows():
            if pd.isna(row['ma']) or pd.isna(row['std']):
                continue
            
            severity = (row['incident_count'] - row['ma']) / row['std'] if row['std'] > 0 else 1.0
            anomalies.append(Anomaly(
                timestamp=str(row['timestamp']),
                expected=float(row['ma']),
                actual=float(row['incident_count']),
                severity=float(severity)
            ))
            
        return anomalies
