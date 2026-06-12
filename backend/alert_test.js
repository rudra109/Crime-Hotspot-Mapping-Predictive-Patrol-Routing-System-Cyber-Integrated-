/**
 * Real-Time Monitoring & Alerts — Automated API Test Suite
 * Tests:
 *   1. GET /alerts             — Retrieve seeded alerts
 *   2. POST /alerts            — Create alert with severity and operational routing
 *   3. POST /alerts/:id/ack    — Acknowledge alert with operator tracking
 *   4. POST /alerts/:id/esc    — Manual escalation with supervisory tracking
 *   5. GET /alerts/:id/history — Notification retention and escalation audit logs
 *   6. POST /alerts/connectors/112 — Emergency response 112 ERSS integration
 *   7. GET /alerts/connectors/112/logs — Sync logs check
 *   8. Repeated-Spike Detection — Multi-alert triggers and auto-escalation
 * 
 * Run: node backend/alert_test.js
 */

const http = require('http');

const BASE = 'http://localhost:8001/api/v1';
let passed = 0, failed = 0;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data ? Buffer.byteLength(data) : 0
      }
    };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', d => (raw += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch {
          resolve({ status: res.statusCode, body: raw });
        }
      });
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
    } else {
      failed++;
      console.log(`  ❌ ${name}: ${result.error}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

async function main() {
  console.log('\n🚨 ===== REAL-TIME MONITORING & ALERTS — API TEST SUITE =====\n');

  let alerts = [];
  let testAlertId = null;

  // 1. GET /alerts
  await test('GET /alerts — retrieve alerts feed', async () => {
    const r = await req('GET', '/alerts');
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    alerts = r.body.alerts || [];
    return { ok: alerts.length > 0, detail: `Found ${alerts.length} alerts in feed. First: ${alerts[0].id} - ${alerts[0].message}` };
  });

  // 2. POST /alerts (Operational Routing)
  await test('POST /alerts — route to Cyber Cell', async () => {
    const r = await req('POST', '/alerts', {
      message: 'Suspicious financial scam and UPI fraud reported',
      sector: 'Satellite',
      severity: 7
    });
    if (r.status !== 201) return { ok: false, error: `Status ${r.status}` };
    const alert = r.body.alert;
    testAlertId = alert.id;
    if (alert.routeCategory !== 'cyber_cell') return { ok: false, error: `Expected routing cyber_cell, got ${alert.routeCategory}` };
    return { ok: true, detail: `Routed successfully to ${alert.routeCategory.toUpperCase()}. Alert ID: ${alert.id}` };
  });

  await test('POST /alerts — route to Quick Response Team (QRT)', async () => {
    const r = await req('POST', '/alerts', {
      message: 'Group physical assault and street fight reported near park',
      sector: 'Paldi',
      severity: 8
    });
    if (r.status !== 201) return { ok: false, error: `Status ${r.status}` };
    const alert = r.body.alert;
    if (alert.routeCategory !== 'quick_response') return { ok: false, error: `Expected routing quick_response, got ${alert.routeCategory}` };
    if (alert.type !== 'Critical') return { ok: false, error: `Expected type Critical, got ${alert.type}` };
    return { ok: true, detail: `Routed successfully to ${alert.routeCategory.toUpperCase()}. Severity threshold: ${alert.type}` };
  });

  // 3. POST /alerts/:id/acknowledge (Acknowledgment Tracking)
  await test('POST /alerts/:id/acknowledge — operator acknowledgment', async () => {
    if (!testAlertId) return { ok: false, error: 'No alert ID to acknowledge' };
    const r = await req('POST', `/alerts/${testAlertId}/acknowledge`, {
      operatorId: 'OP-567',
      operatorName: 'Officer J. Shah',
      notes: 'Investigating transaction trail. Contacted banking partner.'
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}: ${JSON.stringify(r.body)}` };
    const alert = r.body.alert;
    if (alert.status !== 'Acknowledged') return { ok: false, error: `Expected status Acknowledged, got ${alert.status}` };
    return { ok: true, detail: `Acknowledged at: ${alert.acknowledgedAt}. Operator: ${alert.operatorName}` };
  });

  // 4. POST /alerts/:id/escalate (Escalation Workflows)
  await test('POST /alerts/:id/escalate — supervisor manual escalation', async () => {
    if (!testAlertId) return { ok: false, error: 'No alert ID to escalate' };
    const r = await req('POST', `/alerts/${testAlertId}/escalate`, {
      level: 2,
      reason: 'Syndicate link suspected. High urgency.'
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    const alert = r.body.alert;
    if (alert.status !== 'Escalated' || alert.escalationLevel !== 2) {
      return { ok: false, error: `Expected Escalated/Level 2, got ${alert.status}/Level ${alert.escalationLevel}` };
    }
    return { ok: true, detail: `Escalated to LEVEL ${alert.escalationLevel}. EscalatedAt: ${alert.escalatedAt}` };
  });

  // 5. GET /alerts/:id/history (Retention & Timeline History)
  await test('GET /alerts/:id/history — lifecycle audit log tracking', async () => {
    if (!testAlertId) return { ok: false, error: 'No alert ID' };
    const r = await req('GET', `/alerts/${testAlertId}/history`);
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    const hist = r.body.history || [];
    if (hist.length < 3) return { ok: false, error: `Expected at least 3 audit events, got ${hist.length}` };
    const events = hist.map(h => h.event).join(' → ');
    return { ok: true, detail: `Audit trail history matches transitions: [${events}]` };
  });

  // 6. POST /alerts/connectors/112 (ERSS 112 Integration)
  let erssAlertId = null;
  await test('POST /alerts/connectors/112 — ingest emergency call', async () => {
    const r = await req('POST', '/alerts/connectors/112', {
      call_id: 'ERSS-112-998877',
      caller_phone: '+919876543210',
      district: 'Ahmedabad East',
      incident_details: 'Arson attempt reported at local warehouse store',
      latitude: 23.0350,
      longitude: 72.6200,
      emergency_type: 'Arson/Fire Incident',
      timestamp: new Date().toISOString()
    });
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    erssAlertId = r.body.alertId;
    return { ok: !!erssAlertId, detail: `112 Call Ingested. Created Alert: ${erssAlertId}` };
  });

  // 7. GET /alerts/connectors/112/logs
  await test('GET /alerts/connectors/112/logs — verify sync log entries', async () => {
    const r = await req('GET', '/alerts/connectors/112/logs');
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    const logs = r.body.logs || [];
    const hasLog = logs.some(l => l.payload?.call_id === 'ERSS-112-998877');
    return { ok: hasLog, error: 'Ingested call payload missing from logs' };
  });

  // 8. Repeated-Spike Detection
  await test('Repeated-Spike Detection — auto-escalate spike triggers', async () => {
    // We will trigger 3 quick alerts in Bapunagar for type "quick_response" (assault/fight)
    const t = Date.now();
    await req('POST', '/alerts', { message: `Riot incident ${t}-1`, sector: 'Bapunagar', severity: 8 });
    await req('POST', '/alerts', { message: `Riot incident ${t}-2`, sector: 'Bapunagar', severity: 8 });
    const r3 = await req('POST', '/alerts', { message: `Riot incident ${t}-3`, sector: 'Bapunagar', severity: 8 });

    if (r3.status !== 201) return { ok: false, error: `Trigger 3 failed with status ${r3.status}` };
    const finalAlert = r3.body.alert;

    if (finalAlert.status !== 'Escalated' || finalAlert.escalationLevel !== 3) {
      return { ok: false, error: `Expected auto-escalated level 3, got ${finalAlert.status}/level ${finalAlert.escalationLevel}` };
    }

    const histRes = await req('GET', `/alerts/${finalAlert.id}/history`);
    const hist = histRes.body.history || [];
    const hasSpikeEvent = hist.some(h => h.event.includes('Spike'));
    if (!hasSpikeEvent) return { ok: false, error: 'Missing Repeated Spike event in timeline history' };

    return { ok: true, detail: `Auto-escalated to LEVEL ${finalAlert.escalationLevel} due to spike. Audit log event generated successfully.` };
  });

  // Summary
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`🚨 ALERTS TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  if (failed === 0) {
    console.log('✅ ALL REAL-TIME MONITORING & ALERTS TESTS PASSED\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed — check logs\n`);
    process.exit(1);
  }
}

main().catch(console.error);
