import { Request, Response } from 'express';
import { DecisionService } from '../../services/decision-service';

export const getProfiles = async (req: Request, res: Response) => {
  try {
    const profiles = DecisionService.getScenarioProfiles();
    return res.json({ profiles });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const runSimulation = async (req: Request, res: Response) => {
  try {
    const { scenarioId, crowdMultiplier, securityMultiplier } = req.body;
    if (!scenarioId) {
      return res.status(400).json({ error: 'scenarioId is required' });
    }
    const result = await DecisionService.simulateScenario(scenarioId, {
      crowdMultiplier: parseFloat(String(crowdMultiplier || 1.0)),
      securityMultiplier: parseFloat(String(securityMultiplier || 1.0)),
    });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const calculateResourcePlan = async (req: Request, res: Response) => {
  try {
    const unitsCount = parseInt(String(req.query.unitsCount || req.body.unitsCount || 6), 10);
    const timeTarget = parseFloat(String(req.query.timeTarget || req.body.timeTarget || 5.0));
    const coverageTarget = parseFloat(String(req.query.coverageTarget || req.body.coverageTarget || 80.0));

    const result = DecisionService.calculateResourcePlan(unitsCount, timeTarget, coverageTarget);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const getPatrolEfficiencyMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = DecisionService.getPatrolEfficiencyMetrics();
    return res.json(metrics);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};

export const applyDecisionStrategy = async (req: Request, res: Response) => {
  try {
    const { scenarioId, recommendedConstraints, recommendedDispatches } = req.body;
    if (!scenarioId) {
      return res.status(400).json({ error: 'scenarioId is required' });
    }
    const result = await DecisionService.applyTacticalRecommendation({
      scenarioId,
      recommendedConstraints: recommendedConstraints || [],
      recommendedDispatches: recommendedDispatches || []
    });
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
};
