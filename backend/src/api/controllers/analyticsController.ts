import { Request, Response } from 'express';
import { AnalyticsService } from '../../services/analytics-service';

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
