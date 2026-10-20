import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import dns from 'node:dns/promises';
import https from 'node:https';
import { createServer, request as httpRequest } from 'node:http';
import { test } from 'node:test';
import { botRegistry, sendWebhook } from '../server/botRegistry.js';
import { isSafeWebhookUrl } from '../server/rateLimiter.js';
import { isPublicWebhookAddress } from '../server/webhookTransport.js';

const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });

test('webhook public address classification excludes local and special-use ranges', () => {
  for (const ip of ['127.0.0.1', '10.0.0.1', '100.64.0.1', '0.0.0.0', '169.254.169.254',
    '172.16.0.1', '192.168.1.1', '192.0.2.1', '198.18.0.1', '224.0.0.1', '255.255.255.255',
    '::', '::1', '::ffff:127.0.0.1', '::ffff:7f00:1', 'fe80::1', 'fc00::1', 'ff02::1',
    '64:ff9b::7f00:1', '2002:7f00:1::', '2001:db8::1', '3fff::1', 'not-an-ip']) {
    assert.equal(isPublicWebhookAddress(ip), false, ip);
  }
  for (const ip of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2001:4860:4860::8888']) {
    assert.equal(isPublicWebhookAddress(ip), true, ip);
  }
});

test('delivery revalidates DNS, pins the checked address, signs POSTs and refuses redirects', async (t) => {
  const requests = [];
  let sinkCalls = 0;
  let transportCalls = 0;
  let dnsCalls = 0;
  let dnsAnswers = [{ address: '8.8.8.8', family: 4 }];
  const sink = createServer((_req, res) => { sinkCalls++; res.end('sink'); });
  await listen(sink);
  const receiver = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method: req.method, body, signature: req.headers['x-moltsland-signature'] });
    if (req.url.startsWith('/redirect/')) {
      res.writeHead(Number(req.url.split('/').pop()), { location: `http://127.0.0.1:${sink.address().port}/private` });
    } else if (req.url === '/failure') res.writeHead(500);
    res.end('result');
  });
  await listen(receiver);
  t.mock.method(dns, 'lookup', async () => { dnsCalls++; return dnsAnswers; });
  t.mock.method(https, 'request', (url, options, callback) => {
    transportCalls++;
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'webhook.example');
    assert.equal(options.agent, false);
    assert.equal(options.rejectUnauthorized, undefined);
    const before = dnsCalls;
    options.lookup('webhook.example', {}, (error, address, family) => {
      assert.equal(error, null);
      assert.equal(address, '8.8.8.8');
      assert.equal(family, 4);
    });
    options.lookup('webhook.example', { all: true }, (error, addresses) => {
      assert.equal(error, null);
      assert.deepEqual(addresses, [{ address: '8.8.8.8', family: 4 }]);
    });
    assert.equal(dnsCalls, before);
    return httpRequest(`http://127.0.0.1:${receiver.address().port}${url.pathname}`, {
      method: options.method, headers: options.headers, signal: options.signal,
    }, callback);
  });
  t.mock.method(console, 'error', () => {});
  const key = 'webhook-regression';
  const payload = { event: 'chat', message: 'synthetic' };
  const secret = 'synthetic-webhook-signing-secret';
  const deliver = url => {
    botRegistry.set(key, { name: 'test', webhookSecret: secret, webhookUrl: url });
    return sendWebhook(key, payload);
  };
  try {
    assert.equal(await isSafeWebhookUrl('https://webhook.example/success'), true);
    assert.equal(await deliver('https://webhook.example/success'), true);
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].body, JSON.stringify(payload));
    assert.equal(requests[0].signature, createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex'));
    for (const status of [301, 302, 303, 307, 308]) {
      assert.equal(await deliver(`https://webhook.example/redirect/${status}`), false);
    }
    assert.equal(await deliver('https://webhook.example/failure'), false);
    assert.equal(sinkCalls, 0);
    const before = transportCalls;
    for (const url of ['http://webhook.example/', 'https://webhook.example:8443/',
      'https://user:pass@webhook.example/', 'https://localhost/', 'https://127.1/',
      'https://[::ffff:7f00:1]/', 'https://[::]/', 'https://169.254.169.254/']) {
      assert.equal(await deliver(url), false, url);
    }
    for (const answers of [[], [{ address: '127.0.0.1', family: 4 }],
      [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }]]) {
      dnsAnswers = answers;
      assert.equal(await isSafeWebhookUrl('https://webhook.example/success'), false);
      assert.equal(await deliver('https://webhook.example/success'), false);
    }
    assert.equal(transportCalls, before);
    assert.equal(await sendWebhook('unregistered', payload), false);
  } finally {
    botRegistry.delete(key);
    await close(receiver);
    await close(sink);
  }
});
