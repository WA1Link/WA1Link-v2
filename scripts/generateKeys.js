const crypto = require('crypto');

// Generate Ed25519 key pair
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');

const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });

console.log('=== PRIVATE KEY (for createLicense.ts - KEEP SECRET) ===');
console.log(privatePem);
console.log('=== PUBLIC KEY (for license.service.ts) ===');
console.log(publicPem);
