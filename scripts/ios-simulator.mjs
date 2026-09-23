import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = (command, args) => execFileSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
try {
  if (process.platform !== 'darwin') throw new Error('The iPhone Simulator requires macOS with the full Xcode app.');
  const developer = read('xcode-select', ['-p']);
  if (!existsSync(join(developer, 'Applications/Simulator.app'))) throw new Error(`Simulator.app is missing from ${developer}. Install/open the full Xcode app, select its Command Line Tools in Xcode Settings > Locations, and install an iOS runtime in Settings > Components. Command-line tools alone are insufficient.`);
  read('xcodebuild', ['-version']);
  read('pod', ['--version']);
  const devices = JSON.parse(read('xcrun', ['simctl', 'list', 'devices', 'available', '--json'])).devices;
  const phones = Object.entries(devices).filter(([runtime]) => runtime.includes('iOS')).flatMap(([, values]) => values).filter(device => device.name.startsWith('iPhone'));
  const requested = process.argv[2];
  const device = requested ? phones.find(phone => phone.udid === requested || phone.name === requested) : phones.find(phone => phone.state === 'Booted') ?? phones[0];
  if (!device) throw new Error('No matching iPhone simulator. In Xcode > Settings > Components install an iOS runtime; then create an iPhone in Window > Devices and Simulators.');
  console.log(`Launching HomeHuddle on ${device.name}. First native compilation can take several minutes.`);
  execFileSync(process.execPath, ['node_modules/expo/bin/cli', 'run:ios', '--device', device.udid], { cwd: root, stdio: 'inherit', env: process.env });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
