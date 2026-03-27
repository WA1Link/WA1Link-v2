const os = require('os');
const crypto = require('crypto');

const cpus = os.cpus();
const networkInterfaces = os.networkInterfaces();

let mac = '';
for (const interfaces of Object.values(networkInterfaces)) {
  if (!interfaces) continue;
  for (const iface of interfaces) {
    if (!iface.internal && iface.mac && iface.mac !== '00:00:00:00:00:00') {
      mac = iface.mac;
      break;
    }
  }
  if (mac) break;
}

const data = [
  os.hostname(),
  os.platform(),
  os.arch(),
  cpus[0]?.model || '',
  cpus.length.toString(),
  os.totalmem().toString(),
  mac,
].join('|');

const fingerprint = crypto.createHash('sha256').update(data).digest('hex').slice(0, 32);
console.log(fingerprint);
