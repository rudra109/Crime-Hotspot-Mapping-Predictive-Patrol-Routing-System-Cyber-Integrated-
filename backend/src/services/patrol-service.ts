/**
 * Patrol Service — GPS vehicle tracking, route assignment, acknowledgments, and constraints.
 * Provides real-time simulation of patrol vehicle positions for environments without physical GPS.
 */
import * as fs from 'fs';
import * as path from 'path';

const STORE_FILE = path.join(__dirname, '../../../patrol-store.json');

export interface VehiclePosition {
  vehicleId: string;
  lat: number;
  lng: number;
  speed: number;       // km/h
  heading: number;     // degrees 0-360
  timestamp: string;
  accuracy: number;    // meters
  status: 'en_route' | 'on_scene' | 'idle' | 'offline';
  batteryLevel?: number;
}

export interface RouteConstraint {
  id: string;
  type: 'road_closure' | 'curfew' | 'weather' | 'vip_area' | 'construction';
  lat: number;
  lng: number;
  radius: number;   // meters
  description: string;
  active: boolean;
  expiresAt?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface RouteAcknowledgment {
  vehicleId: string;
  routeId: string;
  status: 'pending' | 'acknowledged' | 'rejected' | 'completed';
  officerNote?: string;
  acknowledgedAt?: string;
  rejectedAt?: string;
  completedAt?: string;
  rejectionReason?: string;
}

export interface AssignedRoute {
  routeId: string;
  vehicleId: string;
  waypoints: Array<{ lat: number; lng: number; name?: string; hotspotId?: string }>;
  distanceKm: number;
  estimatedMins: number;
  assignedAt: string;
  status: 'pending' | 'acknowledged' | 'in_progress' | 'completed' | 'rejected';
  currentWaypointIndex: number;
  constraints: string[];  // constraint IDs applied
  turnByTurnInstructions: TurnByTurnStep[];
  priority: 'normal' | 'urgent' | 'critical';
}

export interface TurnByTurnStep {
  step: number;
  instruction: string;
  distance: number;  // meters
  duration: number;  // seconds
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  streetName?: string;
  maneuver: 'straight' | 'turn_left' | 'turn_right' | 'u_turn' | 'arrive' | 'depart';
}

interface PatrolStore {
  vehicles: VehiclePosition[];
  constraints: RouteConstraint[];
  routes: AssignedRoute[];
  acknowledgments: RouteAcknowledgment[];
}

// ─── Ahmedabad patrol vehicle simulation ───────────────────────────────────
const AHMEDABAD_CENTER = { lat: 23.0225, lng: 72.5714 };

const DEFAULT_VEHICLES: VehiclePosition[] = [
  { vehicleId: 'PCR-01', lat: 23.0225, lng: 72.5714, speed: 0, heading: 45, timestamp: new Date().toISOString(), accuracy: 5, status: 'idle', batteryLevel: 92 },
  { vehicleId: 'PCR-02', lat: 23.0398, lng: 72.5281, speed: 35, heading: 180, timestamp: new Date().toISOString(), accuracy: 8, status: 'en_route', batteryLevel: 78 },
  { vehicleId: 'PCR-03', lat: 23.0522, lng: 72.5678, speed: 0, heading: 270, timestamp: new Date().toISOString(), accuracy: 3, status: 'on_scene', batteryLevel: 65 },
  { vehicleId: 'PCR-04', lat: 23.0350, lng: 72.6200, speed: 28, heading: 90, timestamp: new Date().toISOString(), accuracy: 12, status: 'en_route', batteryLevel: 88 },
  { vehicleId: 'PCR-05', lat: 22.9975, lng: 72.6020, speed: 0, heading: 0, timestamp: new Date().toISOString(), accuracy: 6, status: 'idle', batteryLevel: 55 },
  { vehicleId: 'PCR-06', lat: 23.0620, lng: 72.5370, speed: 42, heading: 135, timestamp: new Date().toISOString(), accuracy: 7, status: 'en_route', batteryLevel: 97 },
];

const DEFAULT_CONSTRAINTS: RouteConstraint[] = [
  {
    id: 'rc-001', type: 'road_closure', lat: 23.0310, lng: 72.5880, radius: 300,
    description: 'Road repair work — Ashram Road near Ellis Bridge', active: true,
    expiresAt: new Date(Date.now() + 72 * 3600000).toISOString(), severity: 'medium'
  },
  {
    id: 'rc-002', type: 'curfew', lat: 23.0290, lng: 72.6400, radius: 800,
    description: 'Section 144 imposed — Odhav industrial area after 22:00', active: false,
    severity: 'high'
  },
  {
    id: 'rc-003', type: 'weather', lat: 23.0580, lng: 72.5410, radius: 1200,
    description: 'Heavy rain warning — Thaltej-Bopal corridor, reduced visibility', active: true,
    expiresAt: new Date(Date.now() + 6 * 3600000).toISOString(), severity: 'medium'
  },
  {
    id: 'rc-004', type: 'vip_area', lat: 23.0225, lng: 72.5714, radius: 500,
    description: 'VIP movement — Additional IG Office area, restricted patrol', active: false,
    severity: 'critical'
  },
  {
    id: 'rc-005', type: 'construction', lat: 23.1035, lng: 72.5860, radius: 400,
    description: 'Metro construction — Chandkheda station area', active: true,
    expiresAt: new Date(Date.now() + 30 * 24 * 3600000).toISOString(), severity: 'low'
  },
];

function loadStore(): PatrolStore {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
      return {
        vehicles: data.vehicles || DEFAULT_VEHICLES,
        constraints: data.constraints || DEFAULT_CONSTRAINTS,
        routes: data.routes || [],
        acknowledgments: data.acknowledgments || [],
      };
    }
  } catch { /* ignore */ }
  return { vehicles: DEFAULT_VEHICLES, constraints: DEFAULT_CONSTRAINTS, routes: [], acknowledgments: [] };
}

function saveStore(store: PatrolStore) {
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch { /* ignore */ }
}

// Simulate GPS movement along a small random walk
function simulateGpsUpdate(v: VehiclePosition, constraints: RouteConstraint[]): VehiclePosition {
  if (v.status === 'idle' || v.status === 'offline') {
    return { ...v, timestamp: new Date().toISOString() };
  }
  // Random walk with constraints
  const headingRad = (v.heading * Math.PI) / 180;
  const speedMps = (v.speed / 3600) * 1000; // convert km/h to m/s
  const tickSecs = 5; // simulate 5-second tick
  const distMeters = speedMps * tickSecs;
  const earthRadius = 6371000;
  const dLat = (distMeters * Math.cos(headingRad)) / earthRadius * (180 / Math.PI);
  const dLng = (distMeters * Math.sin(headingRad)) / (earthRadius * Math.cos(v.lat * Math.PI / 180)) * (180 / Math.PI);

  let newLat = v.lat + dLat + (Math.random() - 0.5) * 0.0001;
  let newLng = v.lng + dLng + (Math.random() - 0.5) * 0.0001;

  // Keep inside Ahmedabad bounds
  newLat = Math.max(22.95, Math.min(23.15, newLat));
  newLng = Math.max(72.45, Math.min(72.75, newLng));

  // Check constraint avoidance
  const blocked = constraints.some(c => {
    if (!c.active || c.type === 'curfew') return false;
    const R = 6371000;
    const dφ = (c.lat - newLat) * Math.PI / 180;
    const dλ = (c.lng - newLng) * Math.PI / 180;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(v.lat * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) * Math.sin(dλ / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist < c.radius;
  });

  if (blocked) {
    // Reroute by inverting heading slightly
    return { ...v, heading: (v.heading + 90 + Math.random() * 30) % 360, timestamp: new Date().toISOString() };
  }

  const newHeading = (v.heading + (Math.random() - 0.5) * 20 + 360) % 360;
  const newSpeed = Math.max(15, Math.min(60, v.speed + (Math.random() - 0.5) * 10));

  return {
    ...v,
    lat: newLat,
    lng: newLng,
    heading: Math.round(newHeading),
    speed: Math.round(newSpeed),
    timestamp: new Date().toISOString(),
    accuracy: Math.max(3, Math.min(20, v.accuracy + (Math.random() - 0.5) * 2)),
  };
}

function generateTurnByTurn(waypoints: Array<{ lat: number; lng: number; name?: string }>): TurnByTurnStep[] {
  const steps: TurnByTurnStep[] = [];
  const streetNames = [
    'Ashram Road', 'CG Road', 'SG Highway', 'Ring Road', 'Nehru Bridge',
    'Naroda Road', 'Sardar Patel Ring Road', 'Sindhu Bhavan Road', 'Swastik Cross Road',
    'Maninagar Cross Road', 'Ambawadi Circle', 'Paldi Cross Road'
  ];
  const maneuvers: Array<'straight' | 'turn_left' | 'turn_right'> = ['straight', 'straight', 'turn_left', 'turn_right', 'straight'];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const R = 6371000;
    const dφ = (to.lat - from.lat) * Math.PI / 180;
    const dλ = (to.lng - from.lng) * Math.PI / 180;
    const a = Math.sin(dφ / 2) ** 2 + Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dλ / 2) ** 2;
    const distMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const durSecs = (distMeters / 1000 / 40) * 3600; // assume 40 km/h

    const maneuver = i === 0 ? 'depart' : i === waypoints.length - 2 ? 'arrive' : maneuvers[i % maneuvers.length];
    const street = streetNames[i % streetNames.length];
    const instrMap: Record<string, string> = {
      depart: `Start from ${from.name || 'Police HQ'} on ${street}`,
      arrive: `Arrive at ${to.name || 'destination'}`,
      straight: `Continue straight on ${street} for ${Math.round(distMeters)}m`,
      turn_left: `Turn left onto ${street}`,
      turn_right: `Turn right onto ${street}`,
      u_turn: `Make a U-turn on ${street}`,
    };

    steps.push({
      step: i + 1,
      instruction: instrMap[maneuver] || `Proceed on ${street}`,
      distance: Math.round(distMeters),
      duration: Math.round(durSecs),
      fromLat: from.lat,
      fromLng: from.lng,
      toLat: to.lat,
      toLng: to.lng,
      streetName: street,
      maneuver,
    });
  }
  return steps;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export class PatrolService {
  /** Get all current vehicle GPS positions (with simulated update) */
  getVehiclePositions(): VehiclePosition[] {
    const store = loadStore();
    const updated = store.vehicles.map(v => simulateGpsUpdate(v, store.constraints));
    store.vehicles = updated;
    saveStore(store);
    return updated;
  }

  /** Update a single vehicle position (from real GPS device push) */
  updateVehiclePosition(pos: VehiclePosition): VehiclePosition {
    const store = loadStore();
    const idx = store.vehicles.findIndex(v => v.vehicleId === pos.vehicleId);
    if (idx >= 0) {
      store.vehicles[idx] = { ...pos, timestamp: new Date().toISOString() };
    } else {
      store.vehicles.push({ ...pos, timestamp: new Date().toISOString() });
    }
    saveStore(store);
    return store.vehicles[idx >= 0 ? idx : store.vehicles.length - 1];
  }

  /** Get all route constraints */
  getConstraints(): RouteConstraint[] {
    return loadStore().constraints;
  }

  /** Create or update a constraint */
  upsertConstraint(constraint: Partial<RouteConstraint> & { id: string }): RouteConstraint {
    const store = loadStore();
    const idx = store.constraints.findIndex(c => c.id === constraint.id);
    const full: RouteConstraint = {
      id: constraint.id,
      type: constraint.type || 'road_closure',
      lat: constraint.lat || AHMEDABAD_CENTER.lat,
      lng: constraint.lng || AHMEDABAD_CENTER.lng,
      radius: constraint.radius || 300,
      description: constraint.description || '',
      active: constraint.active ?? true,
      severity: constraint.severity || 'medium',
      expiresAt: constraint.expiresAt,
    };
    if (idx >= 0) store.constraints[idx] = full;
    else store.constraints.push(full);
    saveStore(store);
    return full;
  }

  /** Toggle constraint active state */
  toggleConstraint(id: string, active: boolean): RouteConstraint | null {
    const store = loadStore();
    const constraint = store.constraints.find(c => c.id === id);
    if (!constraint) return null;
    constraint.active = active;
    saveStore(store);
    return constraint;
  }

  /** Assign a route to a vehicle with turn-by-turn instructions */
  assignRoute(
    vehicleId: string,
    waypoints: Array<{ lat: number; lng: number; name?: string; hotspotId?: string }>,
    distanceKm: number,
    estimatedMins: number,
    priority: 'normal' | 'urgent' | 'critical' = 'normal'
  ): AssignedRoute {
    const store = loadStore();
    const activeConstraints = store.constraints.filter(c => c.active).map(c => c.id);
    const routeId = `route-${vehicleId}-${Date.now()}`;
    const turnByTurn = generateTurnByTurn(waypoints);

    const route: AssignedRoute = {
      routeId,
      vehicleId,
      waypoints,
      distanceKm,
      estimatedMins,
      assignedAt: new Date().toISOString(),
      status: 'pending',
      currentWaypointIndex: 0,
      constraints: activeConstraints,
      turnByTurnInstructions: turnByTurn,
      priority,
    };

    // Remove previous pending routes for this vehicle
    store.routes = store.routes.filter(r => r.vehicleId !== vehicleId || r.status === 'completed');
    store.routes.push(route);

    // Create acknowledgment record
    const ack: RouteAcknowledgment = {
      vehicleId,
      routeId,
      status: 'pending',
    };
    store.acknowledgments = store.acknowledgments.filter(a => a.vehicleId !== vehicleId || a.status === 'completed');
    store.acknowledgments.push(ack);

    saveStore(store);
    return route;
  }

  /** Acknowledge or reject a route (officer device action) */
  acknowledgeRoute(vehicleId: string, routeId: string, accepted: boolean, note?: string, rejectionReason?: string): RouteAcknowledgment {
    const store = loadStore();
    const ack = store.acknowledgments.find(a => a.vehicleId === vehicleId && a.routeId === routeId);
    const route = store.routes.find(r => r.routeId === routeId);

    if (ack) {
      if (accepted) {
        ack.status = 'acknowledged';
        ack.acknowledgedAt = new Date().toISOString();
        ack.officerNote = note;
        if (route) route.status = 'acknowledged';
      } else {
        ack.status = 'rejected';
        ack.rejectedAt = new Date().toISOString();
        ack.rejectionReason = rejectionReason;
        if (route) route.status = 'rejected';
      }
    }
    saveStore(store);
    return ack || { vehicleId, routeId, status: accepted ? 'acknowledged' : 'rejected' };
  }

  /** Get current route for a vehicle */
  getVehicleRoute(vehicleId: string): AssignedRoute | null {
    const store = loadStore();
    return store.routes.filter(r => r.vehicleId === vehicleId).sort((a, b) =>
      new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    )[0] || null;
  }

  /** Get all routes */
  getAllRoutes(): AssignedRoute[] {
    return loadStore().routes;
  }

  /** Get all acknowledgments */
  getAllAcknowledgments(): RouteAcknowledgment[] {
    return loadStore().acknowledgments;
  }

  /** Progress a vehicle along its route */
  progressVehicleRoute(vehicleId: string): AssignedRoute | null {
    const store = loadStore();
    const route = store.routes.find(r => r.vehicleId === vehicleId && (r.status === 'acknowledged' || r.status === 'in_progress'));
    if (!route) return null;

    route.status = 'in_progress';
    if (route.currentWaypointIndex < route.waypoints.length - 1) {
      route.currentWaypointIndex++;
    } else {
      route.status = 'completed';
      const ack = store.acknowledgments.find(a => a.routeId === route.routeId);
      if (ack) { ack.status = 'completed'; ack.completedAt = new Date().toISOString(); }
    }
    saveStore(store);
    return route;
  }
}

export const patrolService = new PatrolService();
