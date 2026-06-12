const axios = require('axios');

const BACKEND_URL = 'http://localhost:8001/api/v1';

async function runTests() {
  console.log('--- STARTING PREDICTIVE ANALYTICS INTEGRATION TESTS ---');

  try {
    // 1. Test forecast endpoint (hourly)
    console.log('1. Testing GET /analytics/predict/forecast?window=hourly...');
    const forecastHourRes = await axios.get(`${BACKEND_URL}/analytics/predict/forecast`, {
      params: { window: 'hourly' }
    });
    console.log('   Status:', forecastHourRes.status);
    console.log('   Model Version:', forecastHourRes.data.model_version);
    console.log('   Forecast size:', forecastHourRes.data.forecast.length);
    console.log('   Explainability summary:', forecastHourRes.data.explainability?.explanation);
    if (!forecastHourRes.data.forecast || forecastHourRes.data.forecast.length === 0) {
      throw new Error('Hourly forecast should not be empty');
    }

    // 2. Test forecast endpoint (daily)
    console.log('2. Testing GET /analytics/predict/forecast?window=daily...');
    const forecastDailyRes = await axios.get(`${BACKEND_URL}/analytics/predict/forecast`, {
      params: { window: 'daily' }
    });
    console.log('   Status:', forecastDailyRes.status);
    console.log('   Model Version:', forecastDailyRes.data.model_version);
    console.log('   Forecast size:', forecastDailyRes.data.forecast.length);
    if (!forecastDailyRes.data.forecast || forecastDailyRes.data.forecast.length === 0) {
      throw new Error('Daily forecast should not be empty');
    }

    // 3. Test retraining endpoint
    console.log('3. Testing POST /analytics/predict/retrain...');
    const retrainRes = await axios.post(`${BACKEND_URL}/analytics/predict/retrain`);
    console.log('   Status:', retrainRes.status);
    console.log('   Retrained Model Version:', retrainRes.data.model_version);
    console.log('   Evaluation Metrics MAE:', retrainRes.data.evaluation?.mae);
    console.log('   Evaluation Metrics RMSE:', retrainRes.data.evaluation?.rmse);
    console.log('   Drift Detected:', retrainRes.data.drift_detection?.drift_detected);
    console.log('   Drift message:', retrainRes.data.drift_detection?.message);
    if (retrainRes.data.status !== 'success') {
      throw new Error('Retraining status should be success');
    }

    // 4. Test monitoring list endpoint
    console.log('4. Testing GET /analytics/predict/monitoring...');
    const monitoringRes = await axios.get(`${BACKEND_URL}/analytics/predict/monitoring`);
    console.log('   Status:', monitoringRes.status);
    console.log('   Retraining logs counted:', monitoringRes.data.data.length);
    if (monitoringRes.data.data.length === 0) {
      throw new Error('Monitoring logs should not be empty after retraining');
    }

    // 5. Test prediction history endpoint
    console.log('5. Testing GET /analytics/predict/history...');
    const historyRes = await axios.get(`${BACKEND_URL}/analytics/predict/history`);
    console.log('   Status:', historyRes.status);
    console.log('   History count:', historyRes.data.data.length);
    if (historyRes.data.data.length === 0) {
      throw new Error('Prediction history should not be empty');
    }

    // 6. Test sync outcomes endpoint
    console.log('6. Testing POST /analytics/predict/sync...');
    const syncRes = await axios.post(`${BACKEND_URL}/analytics/predict/sync`);
    console.log('   Status:', syncRes.status);
    console.log('   Synced predictions count:', syncRes.data.synced_count);
    if (syncRes.data.status !== 'success') {
      throw new Error('Sync status should be success');
    }

    console.log('\n✅ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✅');
  } catch (error) {
    console.error('\n❌ INTEGRATION TEST FAILED! ❌');
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
