import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { botRegistry, sendWebhook } from '../server/botRegistry.js';

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });

test('webhook delivery preserves signed POSTs and rejects redirects without contacting the sink', async () => {
  const requests = [];
  let sinkCalls = 0;
  const sink = createServer((_req, res) => { sinkCalls += 1; res.end('sink'); });
  await listen(sink);
  const receiver = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ path: req.url, method: req.method, body, signature: req.headers['x-moltsland-signature'] });
    if (req.url.startsWith('/redirect/')) {
      res.writeHead(Number(req.url.split('/').pop()), { location: `http://127.0.0.1:${sink.address().port}/private` });
    } else if (req.url === '/failure') {
      res.writeHead(500);
    }
    res.end('result');
  });
  await listen(receiver);
  const key = 'webhook-regression';
  const payload = { event: 'chat', message: 'synthetic' };
  const secret = 'synthetic-webhook-signing-secret';
  const errors = [];
  const oldError = console.error;
  console.error = (...args) => errors.push(args);
  try {
    const deliver = path => {
      botRegistry.set(key, { name: 'test', webhookSecret: secret, webhookUrl: `http://127.0.0.1:${receiver.address().port}${path}` });
      return sendWebhook(key, payload);
    };
    assert.equal(await deliver('/success'), true);
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].body, JSON.stringify(payload));
    assert.equal(requests[0].signature, createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex'));
    for (const status of [301, 302, 303, 307, 308]) {
      assert.equal(await deliver(`/redirect/${status}`), false);
    }
    assert.equal(sinkCalls, 0);
    assert.equal(await deliver('/failure'), false);
    assert.equal(errors.length, 6);
    assert.equal(await sendWebhook('unregistered', payload), false);
  } finally {
    console.error = oldError;
    botRegistry.delete(key);
    await close(receiver);
    await close(sink);
  }
});
