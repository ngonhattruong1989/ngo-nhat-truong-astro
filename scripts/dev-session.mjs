
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const project = resolve(process.argv[2]);
const out = process.argv[3] || '/tmp/nnt-cookie.txt';
const vars = {};
for (const line of (await readFile(resolve(project, '.dev.vars'), 'utf8')).split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i > 0) vars[t.slice(0, i)] = t.slice(i + 1).trim();
}
const { signSession } = await import(pathToFileURL(resolve(project, 'src/lib/cms/auth.mjs')).href);
const token = await signSession(vars.ADMIN_USERNAME || 'admin', vars.AUTH_SECRET);
await writeFile(out, token);
console.log('cookie written', out, 'len', token.length);
