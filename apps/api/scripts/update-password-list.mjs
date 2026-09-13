import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const base =
  'https://raw.githubusercontent.com/danielmiessler/SecLists/2026.1/';
const path =
  'Passwords/Common-Credentials/xato-net-10-million-passwords-100000.txt';
const response = await fetch(base + path);
if (!response.ok) throw new Error('Unable to download password list');
const source = await response.text();
const candidates = source.split(/\r?\n/).filter((x) => [...x].length >= 15);
const hashes = [
  ...new Set(
    candidates.map((x) => createHash('sha256').update(x).digest('hex')),
  ),
];
await mkdir('data', { recursive: true });
await writeFile(
  'data/common-passwords.sha256',
  hashes.sort().join('\n') + '\n',
);
const license = await fetch(base + 'LICENSE');
if (!license.ok) throw new Error('Unable to obtain license');
await writeFile('data/SecLists-LICENSE.txt', await license.text());
await writeFile(
  'data/password-list.json',
  JSON.stringify(
    {
      source: base + path,
      release: '2026.1',
      sourceSha256: createHash('sha256').update(source).digest('hex'),
      count: hashes.length,
      coverage:
        'Top 100000 common passwords, filtered to the accepted minimum of 15 code points; shorter passwords are rejected by length. Not a comprehensive breach database.',
    },
    null,
    2,
  ),
);
console.log('Versioned password denylist generated:', hashes.length, 'hashes.');
