/**
 * Cybercrime Intelligence Layer — Automated API Test Suite
 * Tests all 6 new endpoints:
 *   1. /api/v1/cyber/overview    — Summary KPIs, categories, trend, zones
 *   2. /api/v1/cyber/incidents   — All 20 typed incidents
 *   3. /api/v1/cyber/clusters    — Fraud cluster detection
 *   4. /api/v1/cyber/alerts      — Threat zone alerts by severity
 *   5. /api/v1/cyber/correlations — Cyber-physical crime correlations
 *   6. /api/v1/cyber/zones       — Ahmedabad cyber threat zones
 * 
 * Run: node backend/cyber_test.js
 */

const http = require('http');

const BASE = 'http://localhost:8001/api/v1';
let passed = 0, failed = 0;

function req(method, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = { hostname: url.hostname, port: url.port, path: url.pathname, method };
    const r = http.request(opts, res => {
      let raw = '';
      res.on('data', d => (raw += d));
      res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); } catch { resolve({ status: res.statusCode, body: raw }); }});
    });
    r.on('error', reject);
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
  console.log('\n🛡️  ===== CYBERCRIME INTELLIGENCE — API TEST SUITE =====\n');

  // ── 1. Overview ────────────────────────────────────────────────────────────
  console.log('📊 [1] CYBER OVERVIEW');

  let overviewData = null;
  await test('GET /cyber/overview — summary KPIs', async () => {
    const r = await req('GET', '/cyber/overview');
    overviewData = r.body;
    if (r.status !== 200) return { ok: false, error: `Status ${r.status}` };
    const s = r.body.summary;
    if (!s || typeof s.total_incidents !== 'number') return { ok: false, error: 'Missing summary.total_incidents' };
    return { ok: true, detail: `Incidents: ${s.total_incidents} | Loss: ₹${(s.total_loss_inr/100000).toFixed(1)}L | Victims: ${s.total_victims} | Alerts: ${s.active_alerts} | Clusters: ${s.clusters_detected}` };
  });

  await test('Overview contains byCategory breakdown', async () => {
    const cats = overviewData?.byCategory || [];
    if (!Array.isArray(cats) || cats.length === 0) return { ok: false, error: 'byCategory empty' };
    const labels = cats.map(c => c.label).join(', ');
    return { ok: true, detail: `${cats.length} categories: [${labels.slice(0, 80)}...]` };
  });

  await test('Overview contains 14-day trend', async () => {
    const trend = overviewData?.trend || [];
    if (!Array.isArray(trend) || trend.length < 14) return { ok: false, error: `Only ${trend.length} trend days` };
    const totalCount = trend.reduce((s, t) => s + t.count, 0);
    return { ok: true, detail: `14-day trend: ${totalCount} total incidents. Last day: ${trend[trend.length - 1]?.date} count=${trend[trend.length - 1]?.count}` };
  });

  await test('Overview contains zone data', async () => {
    const zones = overviewData?.zones || [];
    if (!Array.isArray(zones) || zones.length === 0) return { ok: false, error: 'zones empty' };
    return { ok: true, detail: `${zones.length} cyber threat zones: ${zones.map(z => z.name.split('/')[0].trim()).join(', ')}` };
  });

  // ── 2. Incidents ───────────────────────────────────────────────────────────
  console.log('\n🚨 [2] CYBER INCIDENTS');

  let incidents = [];
  await test('GET /cyber/incidents — all incidents returned', async () => {
    const r = await req('GET', '/cyber/incidents');
    incidents = r.body.incidents || [];
    if (r.status !== 200 || !Array.isArray(incidents)) return { ok: false, error: `Status ${r.status}` };
    return { ok: incidents.length > 0, detail: `${incidents.length} incidents`, error: 'Empty incidents array' };
  });

  await test('Incidents have all required fields', async () => {
    const required = ['id', 'category', 'subcategory', 'platform', 'financialLoss', 'victims', 'severity', 'lat', 'lng'];
    const missing = incidents.slice(0, 3).flatMap(inc => required.filter(f => inc[f] === undefined));
    if (missing.length > 0) return { ok: false, error: `Missing fields: ${[...new Set(missing)].join(', ')}` };
    return { ok: true, detail: `All fields present. Sample: ${incidents[0].id} | ${incidents[0].category} | ${incidents[0].subcategory}` };
  });

  await test('Incidents include rich category taxonomy', async () => {
    const cats = [...new Set(incidents.map(i => i.category))];
    const expected = ['PHISHING', 'CREDENTIAL_THEFT', 'IMPERSONATION', 'FRAUD_CAMPAIGN', 'RANSOMWARE'];
    const found = expected.filter(e => cats.includes(e));
    return { ok: found.length >= 4, detail: `Found categories: ${cats.join(', ')}`, error: `Only found ${found.length} expected categories` };
  });

  await test('Incidents have category labels and colors', async () => {
    const withLabel = incidents.filter(i => i.category_label && i.category_color);
    return { ok: withLabel.length === incidents.length, detail: `${withLabel.length}/${incidents.length} have label+color`, error: 'Some incidents missing category_label or category_color' };
  });

  await test('Cyber-physical links present in some incidents', async () => {
    const linked = incidents.filter(i => i.physicalLinked);
    if (linked.length === 0) return { ok: false, error: 'No physically linked incidents found' };
    return { ok: true, detail: `${linked.length} incidents linked to physical crimes: ${linked.map(i => `${i.id}→${i.physicalLinked}`).join(', ')}` };
  });

  // ── 3. Clusters ────────────────────────────────────────────────────────────
  console.log('\n🕸️  [3] FRAUD CLUSTER DETECTION');

  let clusters = [];
  await test('GET /cyber/clusters — clusters detected', async () => {
    const r = await req('GET', '/cyber/clusters');
    clusters = r.body.clusters || [];
    if (r.status !== 200 || !Array.isArray(clusters)) return { ok: false, error: `Status ${r.status}` };
    return { ok: clusters.length > 0, detail: `${clusters.length} clusters detected`, error: 'No clusters found' };
  });

  await test('Clusters have financial impact metrics', async () => {
    const withLoss = clusters.filter(c => c.totalLoss > 0);
    const topLoss = Math.max(...clusters.map(c => c.totalLoss));
    return { ok: withLoss.length > 0, detail: `${withLoss.length} clusters with financial loss. Top: ₹${(topLoss/100000).toFixed(1)}L` };
  });

  await test('Clusters have threat levels', async () => {
    const levels = [...new Set(clusters.map(c => c.threatLevel))];
    const valid = levels.every(l => ['LOW','MODERATE','HIGH','CRITICAL'].includes(l));
    return { ok: valid, detail: `Threat levels in data: ${levels.join(', ')}` };
  });

  await test('Clusters track victims and modus operandi', async () => {
    const hasVictims = clusters.filter(c => c.totalVictims > 0);
    const hasModus = clusters.filter(c => c.modus);
    return { ok: hasVictims.length > 0 && hasModus.length > 0, detail: `${hasVictims.length} clusters with victims, ${hasModus.length} with modus. Example: ${clusters[0]?.modus}` };
  });

  // ── 4. Threat Zone Alerts ──────────────────────────────────────────────────
  console.log('\n⚡ [4] CYBER THREAT ZONE ALERTS');

  let alerts = [];
  await test('GET /cyber/alerts — alerts generated', async () => {
    const r = await req('GET', '/cyber/alerts');
    alerts = r.body.alerts || [];
    if (r.status !== 200 || !Array.isArray(alerts)) return { ok: false, error: `Status ${r.status}` };
    return { ok: alerts.length > 0, detail: `${alerts.length} alerts generated`, error: 'No alerts' };
  });

  await test('Alerts have severity grading (CRITICAL/HIGH/WARNING/INFO)', async () => {
    const sevs = [...new Set(alerts.map(a => a.severity))];
    const hasCritical = alerts.some(a => a.severity === 'CRITICAL');
    const hasHigh = alerts.some(a => a.severity === 'HIGH');
    return { ok: hasCritical || hasHigh, detail: `Severity levels: ${sevs.join(', ')}. Critical: ${alerts.filter(a => a.severity === 'CRITICAL').length}` };
  });

  await test('Alerts include recommendations', async () => {
    const withRec = alerts.filter(a => a.recommendation && a.recommendation.length > 10);
    return { ok: withRec.length > 0, detail: `${withRec.length} alerts with recommendations. Sample: "${alerts[0]?.recommendation?.slice(0, 60)}..."` };
  });

  await test('Alerts linked to geographic zones', async () => {
    const withZone = alerts.filter(a => a.zone && a.lat && a.lng);
    return { ok: withZone.length > 0, detail: `${withZone.length} geolocated alerts. Zones: ${withZone.map(a => a.zone).join(', ')}` };
  });

  await test('Active alerts flagged for dispatch', async () => {
    const active = alerts.filter(a => a.isActive);
    return { ok: active.length > 0, detail: `${active.length}/${alerts.length} alerts are active (severity≥WARNING)` };
  });

  // ── 5. Correlations ────────────────────────────────────────────────────────
  console.log('\n🔗 [5] CYBER-PHYSICAL CORRELATIONS');

  let correlations = [];
  await test('GET /cyber/correlations — correlations computed', async () => {
    const r = await req('GET', '/cyber/correlations');
    correlations = r.body.correlations || [];
    if (r.status !== 200 || !Array.isArray(correlations)) return { ok: false, error: `Status ${r.status}` };
    return { ok: true, detail: `${correlations.length} correlations computed` };
  });

  await test('Correlations have scores and risk levels', async () => {
    const withScore = correlations.filter(c => c.correlationScore > 0);
    const riskLevels = [...new Set(correlations.map(c => c.physicalRiskLevel))];
    return { ok: withScore.length > 0, detail: `${withScore.length} correlations with scores. Risk levels: ${riskLevels.join(', ')}. Top score: ${Math.max(...correlations.map(c => c.correlationScore))}` };
  });

  await test('Direct cyber-physical links identified', async () => {
    const withDirect = correlations.filter(c => c.directLinkedIncidents?.length > 0);
    if (withDirect.length === 0) return { ok: false, error: 'No direct links found' };
    return { ok: true, detail: `${withDirect.length} incidents with direct physical links: ${withDirect.map(c => `${c.cyberIncidentId}→[${c.directLinkedIncidents.join(',')}]`).join(' | ')}` };
  });

  // ── 6. Zones ───────────────────────────────────────────────────────────────
  console.log('\n🗺️  [6] CYBER THREAT ZONES');

  await test('GET /cyber/zones — Ahmedabad zones returned', async () => {
    const r = await req('GET', '/cyber/zones');
    const zones = r.body.zones || [];
    if (r.status !== 200 || zones.length === 0) return { ok: false, error: `Status ${r.status} | zones=${zones.length}` };
    return { ok: true, detail: `${zones.length} Ahmedabad cyber zones: ${zones.map(z => z.name.split('/')[0].trim().split(' ').slice(0,2).join(' ')).join(', ')}` };
  });

  // Summary
  console.log('\n══════════════════════════════════════════════════════════════════════');
  console.log(`🛡️  CYBER INTEL TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  if (failed === 0) {
    console.log('✅ ALL CYBERCRIME INTELLIGENCE TESTS PASSED\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed — review output above\n`);
  }

  // Data Summary
  if (overviewData?.summary) {
    const s = overviewData.summary;
    console.log('📋 DATA SUMMARY:');
    console.log(`   🚨 Incidents:     ${s.total_incidents} (20 simulated Ahmedabad cyber cases)`);
    console.log(`   💸 Financial Loss: ₹${(s.total_loss_inr/10000000).toFixed(2)} Crore`);
    console.log(`   👥 Victims:        ${s.total_victims.toLocaleString()}`);
    console.log(`   ⚡ Active Alerts:  ${s.active_alerts}`);
    console.log(`   🕸️  Clusters:       ${s.clusters_detected}`);
    console.log(`   🔗 Correlations:   ${s.cyber_physical_correlations}`);
  }

  console.log('\n📋 MANUAL TESTING GUIDE:');
  console.log('  1. Open http://localhost:3000 → Sidebar → "Cyber Intelligence"');
  console.log('  2. [OVERVIEW TAB] See 6 KPI cards, category bars, loss pie chart, 14-day trend');
  console.log('  3. [INCIDENTS TAB] Browse all 20 incidents → click any row for detailed breakdown');
  console.log('  4. [INCIDENTS TAB] Use search box to filter by "phishing", "UPI", "ransomware" etc.');
  console.log('  5. [CLUSTERS TAB] See fraud clusters → click cluster card for geo/date details');
  console.log('  6. [CORRELATIONS TAB] See cyber-to-physical crime links with correlation scores');
  console.log('  7. [ALERTS TAB] See CRITICAL/HIGH/WARNING alerts with recommendations per zone');
  console.log('  8. [THREAT MAP TAB] Open map — colored circles per zone, markers per incident');
  console.log('  9. [THREAT MAP TAB] Hover incident markers to see case details and financial loss');
  console.log(' 10. Click "REFRESH INTEL" button to re-fetch all data from backend\n');
}

main().catch(console.error);
