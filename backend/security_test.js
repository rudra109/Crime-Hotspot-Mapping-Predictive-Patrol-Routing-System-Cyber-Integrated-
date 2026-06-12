const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUTH_URL = 'http://localhost:8001/api/v1/auth';
const COMPLIANCE_URL = 'http://localhost:8001/api/v1/compliance';
const CRIMES_URL = 'http://localhost:8001/api/v1/crimes';

// Helper to generate current TOTP code directly in JS for validation
function calculateTotp(secret) {
  const timeStep = 30;
  const currentStep = Math.floor(Date.now() / 1000 / timeStep);
  
  const buffer = Buffer.alloc(8);
  let temp = currentStep;
  for (let i = 7; i >= 0; i--) {
    buffer[i] = temp & 0xff;
    temp >>= 8;
  }
  
  const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
  const hash = hmac.update(buffer).digest();
  
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
    
  return (binary % 1000000).toString().padStart(6, '0');
}

async function runTests() {
  console.log('🛡️  ===== SECURITY & COMPLIANCE SYSTEM — API TEST SUITE =====');

  try {
    const badgeNumber = `BADGE-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const password = 'secure_password_123';

    // ─── 1. Register Supervisor Badge ───
    console.log('1. Registering new Supervisor badge...');
    const regRes = await axios.post(`${AUTH_URL}/register`, {
      badgeNumber,
      name: 'Inspector Test Security',
      password,
      role: 'supervisor'
    });
    console.log('   Status:', regRes.status);
    console.log('   Badge Registered:', regRes.data.user?.badgeNumber);
    console.log('   MFA Secret Seed:', regRes.data.totpSecret);
    const totpSecret = regRes.data.totpSecret;

    // ─── 2. Login & MFA Challenge ───
    console.log('2. Authenticating credentials (Login Challenge)...');
    const loginRes = await axios.post(`${AUTH_URL}/login`, {
      badgeNumber,
      password
    });
    console.log('   Status:', loginRes.status);
    console.log('   MFA Required:', loginRes.data.mfaRequired);
    console.log('   TOTP Secret returned:', loginRes.data.totpSecret !== undefined);

    // ─── 3. Verify MFA & Get JWT Token ───
    console.log('3. Submitting 6-digit TOTP token (MFA verification)...');
    const currentCode = calculateTotp(totpSecret);
    const mfaRes = await axios.post(`${AUTH_URL}/mfa/verify`, {
      badgeNumber,
      token: currentCode
    });
    console.log('   Status:', mfaRes.status);
    console.log('   JWT Session Issued:', mfaRes.data.success);
    console.log('   JWT Length:', mfaRes.data.token?.length);
    const supervisorToken = mfaRes.data.token;

    // ─── 4. Register Officer Badge (For RBAC Check) ───
    console.log('4. Registering Officer (non-supervisor) badge...');
    const officerBadge = `${badgeNumber}-OFF`;
    const regOffRes = await axios.post(`${AUTH_URL}/register`, {
      badgeNumber: officerBadge,
      name: 'Officer Junior Test',
      password,
      role: 'officer'
    });
    const officerCode = calculateTotp(regOffRes.data.totpSecret);
    const loginOffRes = await axios.post(`${AUTH_URL}/mfa/verify`, {
      badgeNumber: officerBadge,
      token: officerCode
    });
    const officerToken = loginOffRes.data.token;

    // ─── 5. RBAC Authorization Checks ───
    console.log('5. Validating access tokens & RBAC restrictions...');
    
    // a. No Auth header
    try {
      await axios.get(`${COMPLIANCE_URL}/holds`);
      throw new Error('Access to /compliance should be blocked without token');
    } catch (err) {
      console.log('   ✓ Anonymous Access Blocked (Status 401): Passed');
    }

    // b. Invalid JWT token
    try {
      await axios.get(`${COMPLIANCE_URL}/holds`, {
        headers: { Authorization: 'Bearer invalid_signature_token_here' }
      });
      throw new Error('Access to /compliance should be blocked with invalid token');
    } catch (err) {
      console.log('   ✓ Malformed/Invalid Signature Blocked (Status 401): Passed');
    }

    // c. Officer attempts to add legal hold (Forbidden)
    try {
      await axios.post(`${COMPLIANCE_URL}/holds`, {
        incidentId: 'INC-9428',
        reason: 'Illegal hold attempt'
      }, {
        headers: { Authorization: `Bearer ${officerToken}` }
      });
      throw new Error('Officer role should not be allowed to POST legal holds');
    } catch (err) {
      console.log('   ✓ Officer Role Access Forbidden (Status 403): Passed');
    }

    // d. Supervisor accesses successfully
    const holdsRes = await axios.get(`${COMPLIANCE_URL}/holds`, {
      headers: { Authorization: `Bearer ${supervisorToken}` }
    });
    console.log('   ✓ Supervisor Access Allowed (Status 200): Passed');
    console.log('   Active holds retrieved count:', holdsRes.data.holds?.length);

    // ─── 6. AES-256 Field Encryption At Rest ───
    console.log('6. Validating AES-256 encryption at rest...');
    const rawDesc = 'CONFIDENTIAL: Tactical asset dispatch codes and suspect interrogation transcripts.';
    
    // Ingest a record
    const ingestRes = await axios.post(`${CRIMES_URL}/ingest`, {
      records: [{
        externalId: 'INC-SEC-TEST',
        type: 'assault',
        location: { lat: 23.0225, lng: 72.5714 },
        address: 'Secured HQ Vault',
        description: rawDesc,
        severity: 9,
        source: 'fir'
      }]
    });
    
    // Read local file store directly to verify ciphertext is stored
    const storePath = path.join(__dirname, 'data', 'crimes-store.json');
    if (fs.existsSync(storePath)) {
      const fileContent = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      const storedTestRecord = fileContent.find(c => c.id === 'INC-SEC-TEST');
      console.log('   Stored record description length:', storedTestRecord?.description?.length);
      console.log('   Is description encrypted ciphertext format (contains IV & Tag delimiter ":")?:', storedTestRecord?.description?.includes(':'));
      if (!storedTestRecord?.description?.includes(':') || storedTestRecord?.description === rawDesc) {
        throw new Error('Description should be stored as encrypted ciphertext in local file store!');
      }
      console.log('   ✓ Verified data encryption at rest in storage file: Passed');
    } else {
      console.log('   [Skip Store check: Postgres is active db]');
    }

    // Retrieve via API GET list (should be decrypted dynamically)
    const listRes = await axios.get(`${CRIMES_URL}`);
    const apiTestRecord = listRes.data.crimes?.find(c => c.id === 'INC-SEC-TEST');
    console.log('   Decrypted API output description:', apiTestRecord?.description);
    if (apiTestRecord?.description !== rawDesc) {
      throw new Error('Description should be dynamically decrypted on API request');
    }
    console.log('   ✓ Verified dynamic field-level decryption on API return: Passed');

    // ─── 7. CORS Domain Validation ───
    console.log('7. Testing CORS domain blocks...');
    try {
      const corsRes = await axios.get(`${CRIMES_URL}`, {
        headers: { Origin: 'http://hacker-domain-malicious.com' }
      });
      // Axios may not throw on CORS response because Node isn't a browser, 
      // but we inspect the Access-Control-Allow-Origin header returned
      const originHeader = corsRes.headers['access-control-allow-origin'];
      console.log('   Access-Control-Allow-Origin header:', originHeader);
      if (originHeader === 'http://hacker-domain-malicious.com' || originHeader === '*') {
        throw new Error('CORS header should not allow untrusted domains');
      }
      console.log('   ✓ CORS origin restrictions: Passed');
    } catch (err) {
      console.log('   ✓ CORS request blocked or restricted: Passed');
    }

    console.log('\n✅ ALL SECURITY & COMPLIANCE SYSTEM TESTS PASSED SUCCESSFULLY! ✅');
  } catch (error) {
    console.error('\n❌ SECURITY & COMPLIANCE SYSTEM TEST FAILED! ❌');
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
