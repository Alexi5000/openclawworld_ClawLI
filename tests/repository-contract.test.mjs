import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const root = process.cwd()

function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8')
}

function exists(relativePath) {
  return existsSync(join(root, relativePath))
}

test('repository exposes a complete local quality contract', () => {
  const manifest = JSON.parse(read('package.json'))

  for (const script of [
    'test',
    'check:server',
    'lint:landing',
    'build:client',
    'build:landing',
    'pack:cli',
    'quality',
  ]) {
    assert.ok(manifest.scripts[script], `missing root quality script: ${script}`)
  }
})

test('main application surfaces and the CLI package are present', () => {
  for (const relativePath of [
    'server/index.js',
    'server/httpRoutes.js',
    'client/src',
    'landing-page/src',
    'packages/openclawworld/bin/openclawworld.js',
    'skill.md',
  ]) {
    assert.ok(exists(relativePath), `missing expected application surface: ${relativePath}`)
  }

  const cliManifest = JSON.parse(read('packages/openclawworld/package.json'))
  assert.equal(cliManifest.bin.openclawworld, './bin/openclawworld.js')
})

test('README states the fork purpose, setup, use cases, and support path', () => {
  const readme = read('README.md')

  for (const heading of [
    '## Alexi5000 Fork Purpose',
    '## Verified Setup',
    '## Use Cases',
    '## Support',
    'npm run quality',
  ]) {
    assert.match(readme, new RegExp(heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('community health, ownership, and CI quality gates are present', () => {
  for (const relativePath of [
    'CODE_OF_CONDUCT.md',
    'CONTRIBUTING.md',
    'SECURITY.md',
    'SUPPORT.md',
    'FORK_POLICY.md',
    '.github/CODEOWNERS',
    '.github/workflows/ci.yml',
  ]) {
    assert.ok(exists(relativePath), `missing policy or automation file: ${relativePath}`)
  }

  const workflow = read('.github/workflows/ci.yml')
  for (const command of [
    'npm run test',
    'npm run check:server',
    'npm run lint:landing',
    'npm run build:client',
    'npm run build:landing',
    'npm run pack:cli',
  ]) {
    assert.match(workflow, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})
