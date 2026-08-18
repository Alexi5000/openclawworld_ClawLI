# Fork Policy

## Purpose of this fork

`Alexi5000/openclawworld_ClawLI` is an applied reference implementation for Alexi5000’s agent-building, automation, and AI-agent interface work. It preserves OpenClawWorld’s multiplayer human-and-agent environment while emphasizing reproducible local operation, explicit quality checks, safe self-hosting, and operator-visible agent behavior.

## Maintenance boundary

The upstream project, [DevvGwardo/openclawworld](https://github.com/DevvGwardo/openclawworld), remains the source of truth for its original architecture and general product direction. This fork maintains its own documentation, support policy, repository-contract tests, quality automation, and changes that support Alexi5000’s agent-engineering workflow.

## Contributing upstream changes

When a defect or enhancement is applicable without relying on fork-specific policy or workflow files, contributors should consider opening an issue or pull request upstream as well. Keep upstream-compatible product changes focused and separately reviewable. Do not present fork-specific standards as upstream commitments.

## Synchronization

Before incorporating upstream updates, review changes to authentication, environment variables, deployment behavior, agent integrations, and generated assets. Re-run the complete quality contract after a synchronization:

```bash
npm --prefix server ci
npm --prefix client ci
npm --prefix landing-page ci
npm run quality
```

## Attribution and licensing

Retain upstream attribution and the repository’s MIT license in redistributed work. Preserve third-party asset provenance and respect the licensing terms of every dependency, model provider, and integration used in a deployment.
