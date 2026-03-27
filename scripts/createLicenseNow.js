const crypto = require('crypto');

// Ed25519 private key
const VENDOR_PRIVATE_PEM = `
-----BEGIN PRIVATE KEY-----
MC4CAQAwBQYDK2VwBCIEIKvMC3qfrrL+rVDMEi7ziDWMQkQSXphYm6lLFXi6uoov
-----END PRIVATE KEY-----
`.trim();

function bufToB64u(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function createLicense(fingerprint, numberOfAccount, exp) {
  const payload = {
    fp: fingerprint,
    numberOfAccount,
    exp,
    iat: new Date().toISOString(),
  };

  const payloadJson = JSON.stringify(payload);
  const payloadB64u = bufToB64u(Buffer.from(payloadJson, 'utf8'));

  // Sign with Ed25519
  const privateKey = crypto.createPrivateKey(VENDOR_PRIVATE_PEM);
  const signature = crypto.sign(null, Buffer.from(payloadJson), privateKey);
  const signatureB64u = bufToB64u(signature);

  return `${payloadB64u}.${signatureB64u}`;
}

// Generate license for this device
const fingerprint = '0addeefaf4619472d0f8fbe99e493b38';
const maxAccounts = 999;
const expiresAt = '2030-12-31';

const license = createLicense(fingerprint, maxAccounts, expiresAt);

console.log('\n=== LICENSE GENERATED ===\n');
console.log('Fingerprint:', fingerprint);
console.log('Max Accounts:', maxAccounts);
console.log('Expires:', expiresAt);
console.log('\nLicense Key:\n');
console.log(license);
console.log('\n=========================\n');
