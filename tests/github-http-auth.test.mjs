import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHttpHandler } from '../server/httpRoutes.js';
import { ensureUser, setSessionToken } from '../server/userStore.js';

test('GitHub HTTP routes require possession of the active user session', async () => {
  const oldCwd = process.cwd();
  const scratch = mkdtempSync(join(tmpdir(), 'github-session-'));
  process.chdir(scratch);
  let server;
  try {
    const victim = 'victim-user-id';
    const attacker = 'attacker-user-id';
    const secret = randomBytes(32).toString('hex');
    const otherSecret = randomBytes(32).toString('hex');
    await ensureUser({ userId: victim, name: 'Victim' });
    await ensureUser({ userId: attacker, name: 'Attacker' });
    await setSessionToken(victim, secret);
    await setSessionToken(attacker, otherSecret);
    const sockets = new Map([['socket', { data: { userId: victim } }]]);
    let reads = 0;
    const handler = createHttpHandler({
      rooms: [], botRegistry: new Map(), botSockets: new Map(),
      hashApiKey: value => value, limitHttp: () => false,
      ALLOWED_ORIGINS: ["http://localhost:5174"], io: { sockets: { sockets } },
      githubStore: { getConnection: () => { reads++; return { githubUsername: 'private-account' }; } },
    });
    server = createServer(handler);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const routes = [
      ['GET', `/api/v1/github/status?userId=${victim}`],
      ['GET', `/api/v1/github/repos?userId=${victim}`],
      ['GET', `/api/v1/github/repos/owner/repo/tree?userId=${victim}`],
      ['GET', `/api/v1/github/repos/owner/repo/file?userId=${victim}&path=secret`],
      ['POST', '/api/v1/github/auth', { token: 'not-a-real-pat', userId: victim }],
      ['POST', '/api/v1/github/disconnect', { userId: victim }],
      ['POST', '/api/v1/github/repos/connect', { owner: 'owner', repo: 'repo', userId: victim }],
      ['DELETE', '/api/v1/github/repos/disconnect', { owner: 'owner', repo: 'repo', userId: victim }],
      ['POST', '/api/v1/github/repos/owner/repo/ask', { question: 'secret?', userId: victim }],
      ['POST', '/api/v1/github/repos/owner/repo/pr', { title: 'unauthorized', userId: victim }],
    ];
    for (const [method, path, body] of routes) {
      for (const proof of ['', otherSecret]) {
        const response = await fetch(base + path, { signal: AbortSignal.timeout(2000), method, headers: { 'content-type': 'application/json', ...(proof ? { authorization: `Bearer ${proof}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
        assert.equal(response.status, 401, `${method} ${path}`);
      }
    }
    assert.equal(reads, 0);
    const status = () => fetch(`${base}/api/v1/github/status?userId=${victim}`, { headers: { authorization: `Bearer ${secret}` } });
    assert.equal((await status()).status, 200);
    assert.equal(reads, 1);
    sockets.clear();
    assert.equal((await status()).status, 401);
    sockets.set('socket', { data: { userId: victim } });
    await setSessionToken(victim, randomBytes(32).toString('hex'));
    assert.equal((await status()).status, 401);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    process.chdir(oldCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
});
