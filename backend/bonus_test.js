const axios = require('axios');

const BASE_URL = 'http://localhost:8001/api/v1';
const SMARTCITY_URL = `${BASE_URL}/smartcity`;
const ANOMALY_URL = `${BASE_URL}/analytics/anomalies`;
const ALERTS_URL = `${BASE_URL}/alerts`;

async function runTests() {
  console.log('🤖 ===== PHASE 10: BONUS FEATURES — API TEST SUITE =====');

  try {
    // ─── 1. Smart City SOS Panic Pole Ingestion ───
    console.log('\n1. Testing Smart City SOS Pole Trigger Webhook...');
    const sosRes = await axios.post(`${SMARTCITY_URL}/sos`, {
      poleId: 'SOS-POLE-TEST-99',
      sector: 'Vastrapur',
      notes: 'Test panic button alarm triggered near metro platform.',
      latitude: 23.0398,
      longitude: 72.5281
    });
    console.log('   Status:', sosRes.status);
    console.log('   Success:', sosRes.data.success);
    console.log('   Associated Alert ID:', sosRes.data.alertId);
    if (!sosRes.data.success || !sosRes.data.alertId) {
      throw new Error('SOS Panic Pole webhook did not create a valid alert ID');
    }

    // ─── 2. Smart City Traffic Camera Congestion / Speed Ingestion ───
    console.log('\n2. Testing Smart City Traffic Camera Speed Violation...');
    const trafficRes = await axios.post(`${SMARTCITY_URL}/traffic`, {
      cameraId: 'CAM-TRAF-TEST-88',
      sector: 'Thaltej',
      violationType: 'speeding',
      speedKmh: 140,
      latitude: 23.0596,
      longitude: 72.5394
    });
    console.log('   Status:', trafficRes.status);
    console.log('   Success:', trafficRes.data.success);
    console.log('   Associated Alert ID:', trafficRes.data.alertId);
    if (!trafficRes.data.success || !trafficRes.data.alertId) {
      throw new Error('Traffic Cam webhook did not create a valid alert ID');
    }

    // ─── 3. Smart City Streetlight Blackout IoT Ingestion ───
    console.log('\n3. Testing Smart City Streetlight Blackout IoT Telemetry...');
    const lightRes = await axios.post(`${SMARTCITY_URL}/streetlight`, {
      sensorId: 'IoT-LITE-TEST-77',
      sector: 'Satellite',
      status: 'offline',
      latitude: 23.0045,
      longitude: 72.5845
    });
    console.log('   Status:', lightRes.status);
    console.log('   Success:', lightRes.data.success);
    console.log('   Associated Alert ID:', lightRes.data.alertId);
    if (!lightRes.data.success || !lightRes.data.alertId) {
      throw new Error('Streetlight webhook did not create a valid alert ID');
    }

    // ─── 4. Trigger AI Anomaly Evaluation ───
    console.log('\n4. Running AI Anomaly Evaluation...');
    const checkRes = await axios.post(`${ANOMALY_URL}/check`);
    console.log('   Status:', checkRes.status);
    console.log('   Success:', checkRes.data.success);
    console.log('   New Anomalies Evaluated Count:', checkRes.data.newAnomaliesCount);
    console.log('   Predictive Spike Fired:', checkRes.data.predictiveFired);

    // ─── 5. Fetch Anomalies List ───
    console.log('\n5. Retrieving Active Anomaly Logs...');
    const listRes = await axios.get(ANOMALY_URL);
    console.log('   Status:', listRes.status);
    console.log('   Anomalies Retrieved Count:', listRes.data.anomalies?.length);
    if (!Array.isArray(listRes.data.anomalies)) {
      throw new Error('Anomalies response should contain a list array');
    }

    // ─── 6. Validate Alert Ingestion Integrity ───
    console.log('\n6. Verifying Alert Stream Aggregation...');
    const alertsRes = await axios.get(ALERTS_URL);
    const activeAlerts = alertsRes.data.alerts || [];
    const testSosAlert = activeAlerts.find(a => a.message.includes('SOS-POLE-TEST-99'));
    const testTrafficAlert = activeAlerts.find(a => a.message.includes('CAM-TRAF-TEST-88'));
    const testLightAlert = activeAlerts.find(a => a.message.includes('IoT-LITE-TEST-77'));

    console.log('   Found SOS Alert in Stream:', !!testSosAlert);
    console.log('   Found Traffic Alert in Stream:', !!testTrafficAlert);
    console.log('   Found Streetlight Alert in Stream:', !!testLightAlert);

    if (!testSosAlert || !testTrafficAlert || !testLightAlert) {
      throw new Error('Some smart city alerts were missing from the global alerts stream!');
    }

    console.log('\n✅ ALL BONUS MODULE & SMART CITY INTEGRATION TESTS PASSED! ✅');
  } catch (error) {
    console.error('\n❌ BONUS MODULE INTEGRATION TEST FAILED! ❌');
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

runTests();
