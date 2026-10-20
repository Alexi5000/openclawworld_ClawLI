import dns from "node:dns/promises";
import https from "node:https";
import net from "node:net";

const blocked = new net.BlockList();
for (const [address, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24],
  ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
]) blocked.addSubnet(address, prefix, "ipv4");
for (const [address, prefix] of [
  ["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20],
]) blocked.addSubnet(address, prefix, "ipv6");
const globalV6 = new net.BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");

export function isPublicWebhookAddress(address) {
  const family = net.isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  return family === 6 && globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
}

export function parseWebhookUrl(value) {
  const url = new URL(value);
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (url.protocol !== "https:" || (url.port && url.port !== "443")
    || url.username || url.password || host === "localhost" || host.endsWith(".localhost")
    || host.endsWith(".local") || host.endsWith(".internal")
    || (net.isIP(host) && !isPublicWebhookAddress(host))) {
    throw new Error("Webhook destination is not public HTTPS");
  }
  return { url, host };
}

export async function resolveWebhookDestination(value) {
  const { url, host } = parseWebhookUrl(value);
  const family = net.isIP(host);
  const addresses = family ? [{ address: host, family }]
    : await dns.lookup(host, { all: true, verbatim: true });
  if (!addresses.length || addresses.some(entry => !isPublicWebhookAddress(entry.address))) {
    throw new Error("Webhook destination resolves to a restricted address");
  }
  return { url, host, address: addresses[0].address, family: net.isIP(addresses[0].address) };
}

export async function postWebhook(value, body, headers) {
  const signal = AbortSignal.timeout(5000);
  const destination = await Promise.race([
    resolveWebhookDestination(value),
    new Promise((_, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true })),
  ]);
  return new Promise((resolve, reject) => {
    const request = https.request(destination.url, {
      method: "POST", headers, signal, agent: false,
      lookup: (_hostname, options, callback) => {
        const entry = { address: destination.address, family: destination.family };
        if (options.all) callback(null, [entry]);
        else callback(null, entry.address, entry.family);
      },
    }, response => {
      const success = response.statusCode >= 200 && response.statusCode < 300;
      response.destroy();
      if (success) resolve(true);
      else reject(new Error("Webhook endpoint rejected delivery"));
    });
    request.on("error", reject);
    request.end(body);
  });
}
