import * as fs from 'fs';
import * as path from 'path';
import { patrolService, RouteConstraint } from './patrol-service';
import { AlertsService } from './alerts-service';
import { auditService } from './audit-service';

const DECISION_STORE_FILE = path.join(__dirname, '../../data/decision-store.json');

export interface ScenarioProfile {
  id: string;
  name: string;
  description: string;
  hazardLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  baseSecurityUnitsNeeded: number;
  expectedCrowdDensity: string;
  targetResponseMins: number;
  sectorMultipliers: Record<string, number>;
  recommendedConstraints: Array<{
    id: string;
    type: 'road_closure' | 'curfew' | 'weather' | 'vip_area' | 'construction';
    lat: number;
    lng: number;
    radius: number;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
}

export interface ResourcePlanResult {
  unitsCount: number;
  timeTarget: number;
  coverageTarget: number;
  estimatedAvgResponseTime: number;
  estimatedCoveragePct: number;
  confidenceScore: number;
  warnings: string[];
  tradeoffs: Array<{
    type: 'pro' | 'con';
    description: string;
  }>;
  recommendedAssignments: Array<{
    sector: string;
    suggestedUnits: number;
    rationale: string;
  }>;
}

export interface EfficiencyMetrics {
  responseTimeTrend: Array<{ date: string; avgResponseTime: number; targetTime: number }>;
  sectorCompliance: Array<{ sector: string; complianceRate: number; patrolMiles: number }>;
  fleetStatusBreakdown: Array<{ name: string; value: number; color: string }>;
}

const EVENT_SCENARIOS: Record<string, ScenarioProfile> = {
  RATHA_YATRA: {
    id: 'RATHA_YATRA',
    name: 'Jagannath Ratha Yatra Procession',
    description: 'Annual procession with extreme pedestrian density, traffic roadblocks, and localized brawl risks in Maninagar, CG Road, and central Ahmedabad corridors.',
    hazardLevel: 'CRITICAL',
    baseSecurityUnitsNeeded: 18,
    expectedCrowdDensity: 'Extreme (>100,000)',
    targetResponseMins: 5,
    sectorMultipliers: {
      Maninagar: 2.5,
      'CG Road': 2.0,
      Vastrapur: 1.2,
      Thaltej: 0.8,
    },
    recommendedConstraints: [
      {
        id: 'sim-ry-001',
        type: 'road_closure',
        lat: 23.0225,
        lng: 72.5714,
        radius: 1200,
        description: 'Procession Route Lockdown - Ashram Road & Ellis Bridge Corridor',
        severity: 'critical',
      },
      {
        id: 'sim-ry-002',
        type: 'vip_area',
        lat: 22.9975,
        lng: 72.6020,
        radius: 600,
        description: 'High Crowd Density zone - Jagannath Mandir Perimeter',
        severity: 'high',
      }
    ]
  },
  POLITICAL_RALLY: {
    id: 'POLITICAL_RALLY',
    name: 'SG Highway Dignitary Security Rally',
    description: 'High-profile political meeting with VIP protocols, temporary street blockades, and elevated digital security risk/cyber-espionage profiling.',
    hazardLevel: 'HIGH',
    baseSecurityUnitsNeeded: 12,
    expectedCrowdDensity: 'High (15,000 - 30,000)',
    targetResponseMins: 4,
    sectorMultipliers: {
      'SG Highway': 2.2,
      Thaltej: 1.5,
      Satellite: 1.3,
      Chandkheda: 0.9,
    },
    recommendedConstraints: [
      {
        id: 'sim-pr-001',
        type: 'vip_area',
        lat: 23.0596,
        lng: 72.5394,
        radius: 1000,
        description: 'Dignitary Convoy Zone - SG Highway Corridor',
        severity: 'critical',
      }
    ]
  },
  DIWALI_FESTIVAL: {
    id: 'DIWALI_FESTIVAL',
    name: 'Diwali Commercial Shopping & Fire Safety Week',
    description: 'Peak commercial activity in Vastrapur, Satellite, and CG Road. Elevated risk of commercial theft, fire hazards from fireworks, and parking congestions.',
    hazardLevel: 'MODERATE',
    baseSecurityUnitsNeeded: 8,
    expectedCrowdDensity: 'Moderate-High (scattered)',
    targetResponseMins: 6,
    sectorMultipliers: {
      Vastrapur: 1.8,
      Satellite: 1.6,
      'CG Road': 1.5,
      Maninagar: 1.2,
    },
    recommendedConstraints: [
      {
        id: 'sim-df-001',
        type: 'construction', // representing heavy traffic restriction
        lat: 23.0398,
        lng: 72.5281,
        radius: 500,
        description: 'Vastrapur Shopping District Fire Hazard Vigilance',
        severity: 'medium',
      }
    ]
  },
  ELECTION_DAY: {
    id: 'ELECTION_DAY',
    name: 'City-wide General Polling Security Phase',
    description: 'Securing polling booths in key Ahmedabad sectors. High demand for mobile incident response units to de-escalate polling disputes.',
    hazardLevel: 'HIGH',
    baseSecurityUnitsNeeded: 14,
    expectedCrowdDensity: 'Widespread Moderate (polling booths)',
    targetResponseMins: 4.5,
    sectorMultipliers: {
      Chandkheda: 1.6,
      Naranpura: 1.5,
      Bapunagar: 1.8,
      Memnagar: 1.2,
    },
    recommendedConstraints: [
      {
        id: 'sim-ed-001',
        type: 'curfew',
        lat: 23.0522,
        lng: 72.5678,
        radius: 300,
        description: 'Polling Booth Sec 144 - Naranpura Central School Area',
        severity: 'high',
      }
    ]
  }
};

export class DecisionService {
  private static ensureStore() {
    const dir = path.dirname(DECISION_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public static getScenarioProfiles(): ScenarioProfile[] {
    return Object.values(EVENT_SCENARIOS);
  }

  public static async simulateScenario(
    scenarioId: string,
    params: { crowdMultiplier: number; securityMultiplier: number }
  ): Promise<any> {
    const scenario = EVENT_SCENARIOS[scenarioId];
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    const crowdFactor = params.crowdMultiplier || 1.0;
    const secFactor = params.securityMultiplier || 1.0;

    // Calculate dynamic security gap
    const targetUnits = Math.round(scenario.baseSecurityUnitsNeeded * secFactor);
    const activeVehicles = patrolService.getVehiclePositions().filter(v => v.status !== 'offline');
    const availableUnitsCount = activeVehicles.length;
    const resourceDeficit = Math.max(0, targetUnits - availableUnitsCount);

    // Apply scale multiplier to risk sectors
    const simulatedMultipliers: Record<string, number> = {};
    for (const [sector, mult] of Object.entries(scenario.sectorMultipliers)) {
      simulatedMultipliers[sector] = parseFloat((mult * crowdFactor).toFixed(2));
    }

    // Determine simulation advisories
    const advisories: string[] = [];
    if (resourceDeficit > 0) {
      advisories.push(`Deficit of ${resourceDeficit} PCR units detected for safe event security grid.`);
    } else {
      advisories.push('Active patrol roster meets minimum recommended security threshold.');
    }

    if (scenario.hazardLevel === 'CRITICAL' && crowdFactor > 1.2) {
      advisories.push('Crowd surge potential is EXTREMELY HIGH. Recommend locking down central transit corridors.');
    }

    const simResult = {
      scenarioId,
      name: scenario.name,
      description: scenario.description,
      hazardLevel: scenario.hazardLevel,
      targetUnits,
      availableUnits: availableUnitsCount,
      resourceDeficit,
      sectorMultipliers: simulatedMultipliers,
      recommendedConstraints: scenario.recommendedConstraints,
      advisories,
      confidenceScore: Math.round(Math.min(95, 80 + (availableUnitsCount / targetUnits) * 15)),
    };

    // Log the simulation audit record
    await auditService.record({
      action: 'RUN_SCENARIO_SIMULATION',
      resource: `decision/${scenarioId}`,
      changes: { params, simResult },
      status: 'success'
    });

    return simResult;
  }

  public static calculateResourcePlan(
    unitsCount: number,
    timeTarget: number,
    coverageTarget: number
  ): ResourcePlanResult {
    // Model expected average response time: base 10 mins, each unit reduces by ~0.8 mins, active constraints increase by 0.5 mins
    const activeConstraintsCount = patrolService.getConstraints().filter(c => c.active).length;
    const calculatedAvgTime = Math.max(3.2, 10.0 - unitsCount * 0.75 + activeConstraintsCount * 0.45);
    
    // Model coverage: 1 unit provides ~12% coverage. Constraints reduce active corridor coverage by 4% each
    const baseCoverage = unitsCount * 12.0;
    const calculatedCoverage = Math.min(98, Math.max(10, baseCoverage - activeConstraintsCount * 3.5));

    // Calculate confidence score (based on closeness to targets)
    const timeRatio = timeTarget / calculatedAvgTime;
    const covRatio = calculatedCoverage / coverageTarget;
    const confidenceScore = Math.round(Math.min(98, Math.max(20, (timeRatio * 50) + (Math.min(1.0, covRatio) * 45))));

    const warnings: string[] = [];
    if (calculatedAvgTime > timeTarget) {
      warnings.push(`Expected response time (${calculatedAvgTime.toFixed(1)}m) exceeds agency target of ${timeTarget}m.`);
    }
    if (calculatedCoverage < coverageTarget) {
      warnings.push(`Deployment density yields ${calculatedCoverage.toFixed(0)}% coverage, below target of ${coverageTarget}%.`);
    }
    if (unitsCount < 4) {
      warnings.push('Low active vehicle roster raises operational risk thresholds across Ahmedabad outer sectors.');
    }

    const tradeoffs: Array<{ type: 'pro' | 'con'; description: string }> = [
      {
        type: 'pro',
        description: `Deploying ${unitsCount} units secures active high-risk hotspots under response benchmarks.`
      }
    ];

    if (calculatedAvgTime <= timeTarget) {
      tradeoffs.push({
        type: 'pro' as const,
        description: 'Meets swift-intervention targets for critical life-safety incidents.'
      });
    } else {
      tradeoffs.push({
        type: 'con' as const,
        description: 'Prolonged response times in outer-zones due to vehicle allocation concentrate.'
      });
    }

    if (activeConstraintsCount > 2) {
      tradeoffs.push({
        type: 'con' as const,
        description: `${activeConstraintsCount} active road constraints force patrols onto slower arterial routing detour channels.`
      });
    }

    const recommendedAssignments = [
      {
        sector: 'Vastrapur',
        suggestedUnits: Math.round(unitsCount * 0.35) || 1,
        rationale: 'High commercial traffic corridor. Heavy tourist influx.'
      },
      {
        sector: 'Satellite',
        suggestedUnits: Math.round(unitsCount * 0.25) || 1,
        rationale: 'Responds to digital fraud spikes and cyber-related cluster centers.'
      },
      {
        sector: 'Maninagar',
        suggestedUnits: Math.round(unitsCount * 0.20) || 1,
        rationale: 'Coverage node supporting critical railway station hubs and market gates.'
      }
    ];

    return {
      unitsCount,
      timeTarget,
      coverageTarget,
      estimatedAvgResponseTime: parseFloat(calculatedAvgTime.toFixed(1)),
      estimatedCoveragePct: parseFloat(calculatedCoverage.toFixed(0)),
      confidenceScore,
      warnings,
      tradeoffs,
      recommendedAssignments
    };
  }

  public static getPatrolEfficiencyMetrics(): EfficiencyMetrics {
    const responseTimeTrend = [
      { date: 'Mon', avgResponseTime: 4.8, targetTime: 5.0 },
      { date: 'Tue', avgResponseTime: 4.5, targetTime: 5.0 },
      { date: 'Wed', avgResponseTime: 5.2, targetTime: 5.0 },
      { date: 'Thu', avgResponseTime: 4.2, targetTime: 5.0 },
      { date: 'Fri', avgResponseTime: 4.9, targetTime: 5.0 },
      { date: 'Sat', avgResponseTime: 6.1, targetTime: 5.0 },
      { date: 'Sun', avgResponseTime: 5.5, targetTime: 5.0 }
    ];

    const sectorCompliance = [
      { sector: 'Vastrapur', complianceRate: 94, patrolMiles: 142 },
      { sector: 'Satellite', complianceRate: 88, patrolMiles: 115 },
      { sector: 'SG Highway', complianceRate: 91, patrolMiles: 210 },
      { sector: 'Maninagar', complianceRate: 82, patrolMiles: 95 },
      { sector: 'Chandkheda', complianceRate: 95, patrolMiles: 84 },
      { sector: 'CG Road', complianceRate: 90, patrolMiles: 75 }
    ];

    // Compute vehicle status numbers from patrol service
    const activeVehicles = patrolService.getVehiclePositions();
    const countByStatus: Record<string, number> = {
      en_route: 0,
      on_scene: 0,
      idle: 0,
      offline: 0
    };

    activeVehicles.forEach(v => {
      if (countByStatus[v.status] !== undefined) {
        countByStatus[v.status]++;
      } else {
        countByStatus.idle++;
      }
    });

    const fleetStatusBreakdown = [
      { name: 'En Route Dispatch', value: countByStatus.en_route || 3, color: '#38BDF8' },
      { name: 'Active On-Scene', value: countByStatus.on_scene || 1, color: '#F87171' },
      { name: 'Available Standby', value: countByStatus.idle || 2, color: '#34D399' },
      { name: 'Offline Roster', value: countByStatus.offline || 0, color: '#64748B' }
    ];

    return {
      responseTimeTrend,
      sectorCompliance,
      fleetStatusBreakdown
    };
  }

  public static async applyTacticalRecommendation(payload: {
    scenarioId: string;
    recommendedConstraints: any[];
    recommendedDispatches: any[];
  }): Promise<any> {
    this.ensureStore();

    // 1. Apply constraints to the patrol routing engine
    const appliedConstraints: any[] = [];
    if (payload.recommendedConstraints && Array.isArray(payload.recommendedConstraints)) {
      for (const item of payload.recommendedConstraints) {
        const fullConstraint = patrolService.upsertConstraint({
          id: item.id,
          type: item.type || 'road_closure',
          lat: parseFloat(String(item.lat)),
          lng: parseFloat(String(item.lng)),
          radius: parseInt(String(item.radius || 300), 10),
          description: `[SIMULATED] ${item.description}`,
          active: true,
          severity: item.severity || 'medium'
        });
        appliedConstraints.push(fullConstraint);
      }
    }

    // 2. Trigger critical alert log in dispatcher system
    const activeScenario = EVENT_SCENARIOS[payload.scenarioId];
    const scenarioName = activeScenario ? activeScenario.name : payload.scenarioId;
    const securityAlert = await AlertsService.createAlert({
      message: `[DECISION CENTER] Tactical plan deployed for "${scenarioName}". ${appliedConstraints.length} safety road constraints activated. Please coordinate PCR unit coverage zones.`,
      sector: activeScenario ? Object.keys(activeScenario.sectorMultipliers)[0] : 'Vastrapur',
      severity: activeScenario && activeScenario.hazardLevel === 'CRITICAL' ? 10 : 7,
      source: 'local',
      type: activeScenario && activeScenario.hazardLevel === 'CRITICAL' ? 'Critical' : 'Warning'
    });

    // 3. Dispatch recommended units if vehicle routing has slots
    const appliedDispatches: string[] = [];
    if (payload.recommendedDispatches && Array.isArray(payload.recommendedDispatches)) {
      for (const dispatch of payload.recommendedDispatches) {
        // Mock routing alignment to designated sector
        patrolService.assignRoute(
          dispatch.vehicleId,
          [
            { lat: 23.0225, lng: 72.5714, name: 'HQ Base' },
            { lat: dispatch.lat || 23.0398, lng: dispatch.lng || 72.5281, name: dispatch.sector }
          ],
          4.5,
          12,
          'urgent'
        );
        appliedDispatches.push(dispatch.vehicleId);
      }
    }

    // 4. Record audit log
    await auditService.record({
      action: 'APPLY_TACTICAL_RECOMMENDATION',
      resource: `decision/${payload.scenarioId}`,
      changes: {
        scenarioId: payload.scenarioId,
        appliedConstraintsCount: appliedConstraints.length,
        dispatchedUnits: appliedDispatches,
        alertId: securityAlert.id
      },
      status: 'success'
    });

    return {
      success: true,
      alertId: securityAlert.id,
      appliedConstraintsCount: appliedConstraints.length,
      dispatchedUnitsCount: appliedDispatches.length
    };
  }
}
