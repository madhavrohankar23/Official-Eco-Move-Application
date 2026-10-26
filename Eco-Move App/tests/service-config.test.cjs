const {test}=require('node:test'),assert=require('node:assert/strict');
const {parseServiceEnvironment}=require('../scripts/build-service-config.cjs');
test('service configuration handles Windows, LF and legacy CR boundaries without swallowing commented keys',()=>{
  for(const newline of ['\r\n','\n','\r']){
    const config=parseServiceEnvironment(['# Production webhook','VITE_N8N_WEBHOOK_URL = "https://example.test/webhook/voice"','SMTP_PASS=private-test-value','VITE_N8N_TEST_WEBHOOK_URL=https://example.test/webhook-test/voice'].join(newline));
    assert.deepEqual(Object.keys(config),['production','test']);assert.equal(config.production,'https://example.test/webhook/voice');assert.ok(!JSON.stringify(config).includes('private-test-value'));
  }
});
test('missing endpoints and credential-bearing URLs cannot silently ship',()=>{
  assert.throws(()=>parseServiceEnvironment('# no settings'),/Configure VITE_N8N/);
  for(const endpoint of ['http://example.test/voice','https://user:pass@example.test/voice','https://example.test/voice?secret=key','https://example.test/voice#token'])assert.throws(()=>parseServiceEnvironment('VITE_N8N_WEBHOOK_URL='+endpoint));
});
