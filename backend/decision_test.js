const axios = require('axios');

const BACKEND_URL = 'http://localhost:8001/api/v1/decision';

async function runTests() {
  console.log('⚖️  ===== DECISION SUPPORT SYSTEM — API TEST SUITE =====');

  try {
    // 1. Test profiles list endpoint
    console.log('1. Testing GET /decision/profiles...');
    const profilesRes = await axios.get(`${BACKEND_URL}/profiles`);
    console.log('   Status:', profilesRes.status);
    console.log('   Profiles size:', profilesRes.data.profiles.length);
    if (!profilesRes.data.profiles || profilesRes.data.profiles.length === 0) {
      throw new Error('Profiles list should not be empty');
    }

    // 2. Test run simulation endpoint
    console.log('2. Testing POST /decision/simulate...');
    const simRes = await axios.post(`${BACKEND_URL}/simulate`, {
      scenarioId: 'RATHA_YATRA',
      crowdMultiplier: 1.5,
      securityMultiplier: 1.2
    });
    console.log('   Status:', simRes.status);
    console.log('   Scenario Name:', simRes.data.name);
    console.log('   Confidence Score:', simRes.data.confidenceScore);
    console.log('   Maninagar Risk Multiplier:', simRes.data.sectorMultipliers?.Maninagar);
    console.log('   Advisories Count:', simRes.data.advisories?.length);
    if (simRes.data.scenarioId !== 'RATHA_YATRA') {
      throw new Error('Simulation result scenario ID mismatch');
    }

    // 3. Test resource planning endpoint
    console.log('3. Testing POST /decision/plan...');
    const planRes = await axios.post(`${BACKEND_URL}/plan`, {
      unitsCount: 10,
      timeTarget: 4.5,
      coverageTarget: 90
    });
    console.log('   Status:', planRes.status);
    console.log('   Estimated Avg Response Time:', planRes.data.estimatedAvgResponseTime);
    console.log('   Estimated Coverage:', planRes.data.estimatedCoveragePct);
    console.log('   Confidence Score:', planRes.data.confidenceScore);
    console.log('   Tradeoffs Count:', planRes.data.tradeoffs?.length);
    if (planRes.data.unitsCount !== 10) {
      throw new Error('Planning result unitsCount mismatch');
    }

    // 4. Test efficiency metrics endpoint
    console.log('4. Testing GET /decision/metrics...');
    const metricsRes = await axios.get(`${BACKEND_URL}/metrics`);
    console.log('   Status:', metricsRes.status);
    console.log('   Response Time Trend points:', metricsRes.data.responseTimeTrend?.length);
    console.log('   Sector Compliance records:', metricsRes.data.sectorCompliance?.length);
    console.log('   Fleet breakdown slices:', metricsRes.data.fleetStatusBreakdown?.length);
    if (!metricsRes.data.responseTimeTrend || metricsRes.data.responseTimeTrend.length === 0) {
      throw new Error('Response time trend data should not be empty');
    }

    // 5. Test apply tactical recommendation endpoint
    console.log('5. Testing POST /decision/apply...');
    const applyRes = await axios.post(`${BACKEND_URL}/apply`, {
      scenarioId: 'RATHA_YATRA',
      recommendedConstraints: [
        {
          id: 'sim-ry-test-01',
          type: 'road_closure',
          lat: 23.0225,
          lng: 72.5714,
          radius: 1000,
          description: 'Ratha Yatra Test Procession Loop',
          severity: 'high'
        }
      ],
      recommendedDispatches: [
        { vehicleId: 'PCR-01', sector: 'Vastrapur', lat: 23.0398, lng: 72.5281 }
      ]
    });
    console.log('   Status:', applyRes.status);
    console.log('   Applied Constraints:', applyRes.data.appliedConstraintsCount);
    console.log('   Dispatched Units:', applyRes.data.dispatchedUnitsCount);
    console.log('   Associated System Alert ID:', applyRes.data.alertId);
    if (applyRes.data.success !== true) {
      throw new Error('Application of tactical recommendation should succeed');
    }

    console.log('\n✅ ALL DECISION SUPPORT SYSTEM TESTS PASSED SUCCESSFULLY! ✅');
  } catch (error) {
    console.error('\n❌ DECISION SUPPORT INTEGRATION TEST FAILED! ❌');
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
