import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createHttpHandler } from '../server/httpRoutes.js';
import { ensureUser, setSessionToken } from '../server/userStore.js';
import * as bridge from '../server/llmBridge.js';

test('GitHub ask preserves prototype-named files through the HTTP and prompt boundaries', async () => {
  const oldCwd = process.cwd();
  const scratch = mkdtempSync(join(tmpdir(), 'github-file-map-'));
  const realFetch = globalThis.fetch;
  process.chdir(scratch);
  let server;
  try {
    const userId = 'file-map-user';
    const token = randomBytes(32).toString('hex');
    await ensureUser({ userId, name: 'File reader' });
    await setSessionToken(userId, token);
    const requested = [];
    const captured = [];
    let prompt;
    globalThis.fetch = async (url, options) => {
      assert.ok(String(url).endsWith('/v1/chat/completions'));
      prompt = JSON.parse(options.body).messages[0].content;
      return Response.json({ choices: [{ message: { content: 'offline answer' } }] });
    };
    server = createServer(createHttpHandler({
      rooms: [], botRegistry: new Map(), botSockets: new Map(),
      hashApiKey: value => value, limitHttp: () => false,
      ALLOWED_ORIGINS: ['http://localhost:5174'],
      io: { sockets: { sockets: new Map([['socket', { data: { userId } }]]) } },
      githubStore: {
        getConnection: () => ({ token: 'offline-fixture' }),
        getRepoTreeCache: () => [],
      },
      githubService: { fetchFileContent: async (_token, _owner, _repo, file) => {
        requested.push(file);
        if (file === 'unreadable') throw new Error('not found');
        return { content: `content for ${file}` };
      } },
      llmBridge: { askCodeQuestion: args => { captured.push(args.fileContents); return bridge.askCodeQuestion(args); } },
    }));
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const ask = files => realFetch(`http://127.0.0.1:${server.address().port}/api/v1/github/repos/owner/repo/ask`, {
      method: 'POST', signal: AbortSignal.timeout(2000),
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ userId, question: 'Read these files', files }),
    });
    const names = ['__proto__', 'constructor', 'prototype', 'toString', 'src/main.js'];
    const response = await ask([...names, 'sixth.txt']);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).answer, 'offline answer');
    assert.deepEqual(requested, names);
    assert.equal(Object.getPrototypeOf(captured[0]), Object.prototype);
    for (const name of names) {
      assert.equal(Object.hasOwn(captured[0], name), true);
      assert.equal(captured[0][name], `content for ${name}`);
      assert.ok(prompt.includes(`File: ${name}\n`));
      assert.ok(prompt.includes(`content for ${name}`));
    }
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal((await ask(['unreadable', 'README.md'])).status, 200);
    assert.deepEqual(Object.keys(captured[1]), ['README.md']);
    assert.equal((await ask(undefined)).status, 200);
    assert.deepEqual(Object.keys(captured[2]), []);
  } finally {
    globalThis.fetch = realFetch;
    if (server) await new Promise(resolve => server.close(resolve));
    process.chdir(oldCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
});
