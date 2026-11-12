import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const ROOTS = ['src', 'server', 'public']
const TEXT_EXTENSIONS = new Set(['.css', '.html', '.js', '.jsx', '.json', '.mjs', '.scss', '.svg', '.ts', '.tsx'])
const forbidden = /(?:https?:)?\/\/[^\s"']*daumcdn\.net/gi
const violations = []

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      await scan(path)
      continue
    }
    if (!TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue
    const text = await readFile(path, 'utf8')
    for (const match of text.matchAll(forbidden)) violations.push(`${relative('.', path)}: ${match[0]}`)
  }
}

for (const root of ROOTS) await scan(root)

if (violations.length) {
  console.error('카카오맵 내부 daumcdn.net 리소스 직접 호출을 발견했습니다.')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exitCode = 1
} else {
  console.log('카카오맵은 공식 SDK/API만 사용하며 daumcdn.net 직접 호출이 없습니다.')
}
