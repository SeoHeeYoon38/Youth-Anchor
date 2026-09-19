import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const viteBin = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url))
const forwardedArgs = process.argv.slice(2)

// .env는 서버 프로세스에서만 필요하다. Vite는 자체적으로 .env를 읽는다.
const api = spawn(process.execPath, ['--env-file-if-exists=.env', '--watch', 'server/index.js'], { stdio: 'inherit' })
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
