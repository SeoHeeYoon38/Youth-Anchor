import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const forwardedArgs = process.argv.slice(2)

const api = spawn(process.execPath, ['--watch', 'server/index.js'], { stdio: 'inherit' })
const web = spawn(process.execPath, [viteBin, ...forwardedArgs], { stdio: 'inherit' })

let stopping = false

function stop(exitCode = 0) {
  if (stopping) return
  stopping = true
  api.kill()
  web.kill()
  process.exitCode = exitCode
}

api.on('exit', (code) => {
  if (!stopping && code) stop(code)
})

web.on('exit', (code) => {
  if (!stopping) stop(code || 0)
})

process.on('SIGINT', () => stop())
process.on('SIGTERM', () => stop())
