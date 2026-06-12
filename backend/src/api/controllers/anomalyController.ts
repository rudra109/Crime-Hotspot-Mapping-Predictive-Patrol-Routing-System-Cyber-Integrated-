import { Request, Response } from 'express';
import { AnomalyService } from '../../services/anomaly-service';

export const getAnomalies = async (req: Request, res: Response) => {
  try {
    const list = await AnomalyService.getAnomalies();
    return res.json({ success: true, anomalies: list });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const runCheck = async (req: Request, res: Response) => {
  try {
    const newAnomalies = await AnomalyService.checkAnomalies();
    const predictiveFired = await AnomalyService.runPredictiveSpikeTrigger();
    return res.json({
      success: true,
      message: 'Anomaly evaluation completed successfully.',
      newAnomaliesCount: newAnomalies.length,
      newAnomalies,
      predictiveFired
    });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
