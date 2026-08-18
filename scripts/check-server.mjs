import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const root = process.cwd()
const serverDirectory = join(root, 'server')
const serverFiles = readdirSync(serverDirectory)
  .filter((name) => name.endsWith('.js'))
  .sort()

assert.ok(serverFiles.length > 0, 'expected server JavaScript files')

for (const name of serverFiles) {
  execFileSync(process.execPath, ['--check', join(serverDirectory, name)], {
    stdio: 'inherit',
  })
}

const routes = readFileSync(join(serverDirectory, 'httpRoutes.js'), 'utf8')
assert.match(routes, /['"]\/health['"]/, 'expected a /health route')

console.log(`Validated syntax for ${serverFiles.length} server modules and confirmed the health route.`)
