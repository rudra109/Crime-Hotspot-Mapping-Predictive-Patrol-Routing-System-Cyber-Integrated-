import { Request, Response } from 'express';
import { AnalyticsService } from '../../services/analytics-service';
import { PredictiveService } from '../../services/predictive-service';

export const getSourceBreakdown = async (_req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getSourceBreakdown();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getDailyTrends = async (req: Request, res: Response) => {
  try {
    const days = Math.max(7, parseInt(String(req.query.days || '30'), 10) || 30);
    const data = await AnalyticsService.getDailyTrends(days);
    return res.status(200).json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getSeasonalTrends = async (_req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getSeasonalTrends();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getZoneRiskScores = async (_req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getZoneRiskScores();
    return res.status(200).json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getHotspotPredictions = async (_req: Request, res: Response) => {
  try {
    const data = await AnalyticsService.getHotspotPredictions();
    return res.status(200).json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getForecast = async (req: Request, res: Response) => {
  try {
    const window = String(req.query.window || 'hourly');
    const data = await PredictiveService.generateForecast(window);
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const runRetraining = async (_req: Request, res: Response) => {
  try {
    const data = await PredictiveService.runRetraining();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getModelMonitoring = async (_req: Request, res: Response) => {
  try {
    const data = await PredictiveService.getModelMonitoring();
    return res.status(200).json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getPredictionHistory = async (req: Request, res: Response) => {
  try {
    const limit = Math.max(10, parseInt(String(req.query.limit || '100'), 10) || 100);
    const data = await PredictiveService.getPredictionHistory(limit);
    return res.status(200).json({ data });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const syncActualOutcomes = async (_req: Request, res: Response) => {
  try {
    const data = await PredictiveService.syncActualOutcomes();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

