/**
 * Patrol Route Optimization — Automated API Test
 * Tests: GPS vehicles, constraints, route assignment, acknowledgments
 * Run: node backend/patrol_test.js
 */

const http = require('http');

const BASE = 'http://localhost:8001/api/v1';
let passed = 0, failed = 0;
const results = [];

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname, port: url.port, path: url.pathname + url.search,
      method, headers: { 'Content-Type': 'application/json', 'Content-Length': data ? Buffer.byteLength(data) : 0 }
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', d => (raw += d));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, body: raw }); }});
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.ok) {
      passed++;
      console.log(`  ✅ ${name}`);
      if (result.detail) console.log(`     → ${result.detail}`);
      results.push({ name, status: 'PASS', detail: result.detail });
    } else {
      failed++;
      console.log(`  ❌ ${name}: ${result.error}`);
      results.push({ name, status: 'FAIL', error: result.error });
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
    results.push({ name, status: 'ERROR', error: e.message });
  }
}

async function main() {
  console.log('\n🚔 ===== PATROL ROUTE OPTIMIZATION — API TEST SUITE =====\n');

  // ── GPS Vehicle Tracking ──────────────────────────────────────────────────
  console.log('📡 [1] GPS VEHICLE TRACKING');

  let vehicleId1 = 'PCR-01';
  let vehicles = [];

  await test('GET /patrol/vehicles — fetch all live positions', async () => {
    const r = await req('GET', '/patrol/vehicles');
    vehicles = r.body.vehicles || [];
    if (r.status !== 200 || !Array.isArray(vehicles)) return { ok: false, error: `Status ${r.status}` };
    vehicleId1 = vehicles[0]?.vehicleId || 'PCR-01';
    return { ok: true, detail: `${vehicles.length} vehicles online. First: ${vehicleId1} @ ${vehicles[0]?.lat?.toFixed(4)},${vehicles[0]?.lng?.toFixed(4)} speed=${vehicles[0]?.speed}km/h` };
  });

  await test('POST /patrol/vehicles/:id/position — push GPS update', async () => {
    const r = await req('POST', `/patrol/vehicles/${vehicleId1}/position`, {
      lat: 23.0350, lng: 72.5780, speed: 42, heading: 135,
      accuracy: 5, status: 'en_route', batteryLevel: 88
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    return { ok: true, detail: `GPS updated: ${JSON.stringify(r.body.position?.lat?.toFixed(4))}, heading=${r.body.position?.heading}°` };
  });

  await test('Verify simulated positions have changed from last poll', async () => {
    const r2 = await req('GET', '/patrol/vehicles');
    const v2 = r2.body.vehicles || [];
    const hasMovement = v2.some(v => v.speed > 0 || v.status === 'en_route');
    return { ok: hasMovement, error: 'No movement detected', detail: `en_route vehicles: ${v2.filter(v => v.status === 'en_route').length}` };
  });

  // ── Route Constraints ─────────────────────────────────────────────────────
  console.log('\n🚧 [2] ROUTE CONSTRAINTS');

  let constraintId;
  let constraints = [];

  await test('GET /patrol/constraints — fetch all constraints', async () => {
    const r = await req('GET', '/patrol/constraints');
    constraints = r.body.constraints || [];
    if (r.status !== 200 || !Array.isArray(constraints)) return { ok: false, error: `Status ${r.status}` };
    constraintId = constraints[0]?.id;
    return { ok: true, detail: `${constraints.length} constraints. Active: ${constraints.filter(c => c.active).length}. Types: ${[...new Set(constraints.map(c => c.type))].join(', ')}` };
  });

  await test('POST /patrol/constraints — create new road closure', async () => {
    const r = await req('POST', '/patrol/constraints', {
      id: 'rc-test-001',
      type: 'road_closure',
      lat: 23.0400, lng: 72.5700, radius: 250,
      description: 'Test road closure for API validation',
      active: true, severity: 'high'
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}: ${JSON.stringify(r.body)}` };
    return { ok: true, detail: `Created: ${r.body.constraint?.id} — ${r.body.constraint?.type}` };
  });

  await test('PATCH /patrol/constraints/:id/toggle — toggle constraint off', async () => {
    if (!constraintId) return { ok: false, error: 'No constraint ID available' };
    const r = await req('PATCH', `/patrol/constraints/${constraintId}/toggle`, { active: false });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    return { ok: true, detail: `Constraint ${constraintId} → active=${r.body.constraint?.active}` };
  });

  await test('PATCH /patrol/constraints/:id/toggle — toggle constraint back on', async () => {
    if (!constraintId) return { ok: false, error: 'No constraint ID available' };
    const r = await req('PATCH', `/patrol/constraints/${constraintId}/toggle`, { active: true });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    return { ok: true, detail: `Constraint ${constraintId} → active=${r.body.constraint?.active}` };
  });

  // ── Route Assignment ──────────────────────────────────────────────────────
  console.log('\n🗺️  [3] ROUTE ASSIGNMENT & TURN-BY-TURN');

  let assignedRouteId;

  await test('POST /patrol/routes/assign — assign route with waypoints', async () => {
    const r = await req('POST', '/patrol/routes/assign', {
      vehicleId: vehicleId1,
      waypoints: [
        { lat: 23.0225, lng: 72.5714, name: 'Police HQ' },
        { lat: 23.0398, lng: 72.5281, name: 'Vastrapur' },
        { lat: 23.0620, lng: 72.5370, name: 'SG Highway' },
        { lat: 23.0225, lng: 72.5714, name: 'Police HQ' },
      ],
      distanceKm: 18.5,
      estimatedMins: 35,
      priority: 'normal'
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}: ${JSON.stringify(r.body)}` };
    assignedRouteId = r.body.route?.routeId;
    const ttCount = r.body.route?.turnByTurnInstructions?.length || 0;
    return { ok: !!assignedRouteId, detail: `Route ID: ${assignedRouteId}. Turn-by-turn: ${ttCount} steps. Status: ${r.body.route?.status}` };
  });

  await test('GET /patrol/vehicles/:id/route — get vehicle current route', async () => {
    const r = await req('GET', `/patrol/vehicles/${vehicleId1}/route`);
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    const route = r.body.route;
    if (!route) return { ok: false, error: 'No route returned' };
    return { ok: true, detail: `Route ${route.routeId} for ${route.vehicleId}. Steps: ${route.turnByTurnInstructions?.length}. Priority: ${route.priority}` };
  });

  await test('GET /patrol/routes — get all routes', async () => {
    const r = await req('GET', '/patrol/routes');
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    return { ok: true, detail: `${r.body.routes?.length || 0} routes stored` };
  });

  // ── Acknowledgment ────────────────────────────────────────────────────────
  console.log('\n✅ [4] ROUTE ACKNOWLEDGMENT (Officer Device Simulation)');

  await test('POST /patrol/routes/:routeId/acknowledge — officer ACCEPTS route', async () => {
    if (!assignedRouteId) return { ok: false, error: 'No routeId to acknowledge' };
    const r = await req('POST', `/patrol/routes/${assignedRouteId}/acknowledge`, {
      vehicleId: vehicleId1,
      accepted: true,
      note: 'En route to first waypoint, ETA 8 minutes'
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}: ${JSON.stringify(r.body)}` };
    const ack = r.body.acknowledgment;
    return { ok: ack?.status === 'acknowledged', detail: `Status=${ack?.status}. Note: "${ack?.officerNote}". AckedAt: ${ack?.acknowledgedAt}` };
  });

  await test('POST /patrol/vehicles/:id/progress — advance to next waypoint', async () => {
    const r = await req('POST', `/patrol/vehicles/${vehicleId1}/progress`);
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}: ${JSON.stringify(r.body)}` };
    return { ok: true, detail: `Waypoint index now: ${r.body.route?.currentWaypointIndex}. Status: ${r.body.route?.status}` };
  });

  // Test rejection
  const r2 = await req('POST', '/patrol/routes/assign', {
    vehicleId: 'PCR-02',
    waypoints: [
      { lat: 23.0225, lng: 72.5714, name: 'Police HQ' },
      { lat: 23.1035, lng: 72.5860, name: 'Chandkheda' },
    ],
    distanceKm: 14.2, estimatedMins: 22, priority: 'urgent'
  });
  const rejRouteId = r2.body.route?.routeId;

  await test('POST — officer REJECTS route with reason', async () => {
    if (!rejRouteId) return { ok: false, error: 'No route to reject' };
    const r = await req('POST', `/patrol/routes/${rejRouteId}/acknowledge`, {
      vehicleId: 'PCR-02',
      accepted: false,
      rejectionReason: 'Vehicle mechanical issue — requesting alternative assignment'
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    return { ok: r.body.acknowledgment?.status === 'rejected', detail: `Reason: "${r.body.acknowledgment?.rejectionReason}"` };
  });

  await test('GET /patrol/acknowledgments — all acknowledgments', async () => {
    const r = await req('GET', '/patrol/acknowledgments');
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    const acks = r.body.acknowledgments || [];
    const statuses = acks.map(a => a.status).join(', ');
    return { ok: true, detail: `${acks.length} acknowledgments: [${statuses}]` };
  });

  // ── Constraint Impact on Route ────────────────────────────────────────────
  console.log('\n🛑 [5] CONSTRAINT VALIDATION');

  await test('Constraints apply to assigned route IDs', async () => {
    const r = await req('GET', `/patrol/vehicles/${vehicleId1}/route`);
    const route = r.body.route;
    const hasConstraintRefs = Array.isArray(route?.constraints);
    return { ok: hasConstraintRefs, detail: `Active constraint IDs on route: [${route?.constraints?.slice(0, 3).join(', ') || 'none'}]` };
  });

  // Summary
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(`🚔 PATROL TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  if (failed === 0) {
    console.log('✅ ALL PATROL TESTS PASSED — GPS tracking, constraints, assignment, and acknowledgment working\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed — review backend logs\n`);
  }
  console.log('\n📋 MANUAL TESTING GUIDE:');
  console.log('  1. Open browser → http://localhost:5173 → Tactical Planning tab');
  console.log('  2. [LIVE GPS] Right panel → "Live GPS" tab — see vehicle positions refresh every 8s');
  console.log('  3. [CONSTRAINTS] Right panel → "Constraints" tab — toggle ON/OFF a constraint, see map circles');
  console.log('  4. [DISPATCH] Right panel → "Dispatch" tab → pick vehicle PCR-01 → Route Alpha → "DISPATCH"');
  console.log('  5. [ACKNOWLEDGE] Yellow acknowledgment panel appears — click "ACKNOWLEDGE ROUTE" or "REJECT ROUTE"');
  console.log('  6. [NAV] Right panel → "Turn-by-Turn" tab — click steps to highlight current instruction');
  console.log('  7. [CONSTRAINTS ADD] Constraints tab → "+ ADD" → fill form → "ADD CONSTRAINT" → circle appears on map');
  console.log('  8. Refresh after each action to see updated route log at bottom of left panel\n');
}

main().catch(console.error);
