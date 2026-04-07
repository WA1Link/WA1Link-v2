const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

function getHardwareUUID() {
  const platform = os.platform();

  try {
    if (platform === 'win32') {
      const output = execSync('wmic csproduct get UUID', {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true,
      });
      const uuid = output.split('\n').map(l => l.trim()).filter(l => l && l !== 'UUID')[0];
      if (uuid && uuid !== 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF') {
        return uuid.toLowerCase();
      }
    } else if (platform === 'darwin') {
      const output = execSync(
        'ioreg -rd1 -c IOPlatformExpertDevice | grep IOPlatformUUID',
        { encoding: 'utf8', timeout: 5000 },
      );
      const match = output.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
      if (match?.[1]) {
        return match[1].toLowerCase();
      }
    } else {
      const id = execSync('cat /etc/machine-id', {
        encoding: 'utf8',
        timeout: 5000,
      }).trim();
      if (id) return id;
    }
  } catch {
    // Fall through
  }

  const cpus = os.cpus();
  return [platform, os.arch(), cpus[0]?.model || 'unknown'].join('|');
}

const hwid = getHardwareUUID();
const fingerprint = crypto.createHash('sha256').update(hwid).digest('hex').slice(0, 32);
console.log(fingerprint);
