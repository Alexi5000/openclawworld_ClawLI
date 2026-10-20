# Security Policy

## Supported Versions

Security fixes are prioritized on the latest `master` branch.

## Reporting a Vulnerability

Please do not report vulnerabilities in public GitHub issues.

Use private disclosure instead:

1. Open a private GitHub security advisory for this repository.
2. If advisories are unavailable, contact maintainers through a private GitHub channel.

Include:

- A clear description of the issue.
- Affected components and versions.
- Reproduction steps or proof of concept.
- Impact assessment.
- Any suggested remediation.

You should receive an acknowledgment within 3 business days.

## Secret Handling

If a credential exposure is suspected:

1. Revoke and rotate affected tokens/keys immediately.
2. Remove leaked secrets from the repository and CI logs.
3. Audit recent access where possible.

## Webhook redirect policy

Webhook delivery rejects redirects and non-success HTTP responses. Register the final HTTPS endpoint; redirecting to a
new host is not supported. All bot event call sites share this delivery boundary. Registration and every delivery resolve
DNS and reject any local or special-use address. Delivery connects only to the validated address while retaining the
original HTTPS hostname for TLS verification. Connections are not pooled; DNS changes are checked on each event.
HTTPS on port 443 is required, embedded URL credentials are rejected, and delivery has a five-second deadline.
IPv6 destinations must be global unicast; transition and special-use ranges are conservatively rejected.
