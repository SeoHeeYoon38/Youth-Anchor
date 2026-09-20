import net from 'node:net'

const required = [
  ['DATA_GO_KR_SERVICE_KEY', '지원사업 API 동기화'],
  ['VITE_KAKAO_MAP_APP_KEY', '카카오 지도 표시'],
  ['KAKAO_REST_API_KEY', '주소→좌표 보정(선택)'],
  ['OPENAI_API_KEY', 'AI 안내 가온'],
  ['HAVEN_JWT_SECRET', '익명 토큰 서명'],
  ['HAVEN_ADMIN_KEY', '관리자 API']
]

function mask(value) {
  if (!value) return '(비어 있음)'
  if (value.length <= 8) return `${value.slice(0, 2)}****`
  return `${value.slice(0, 4)}****${value.slice(-4)}`
}

function checkPort(port) {
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.once('error', (error) => resolve(error.code === 'EADDRINUSE' ? '사용 중' : `확인 실패(${error.code})`))
    probe.once('listening', () => probe.close(() => resolve('사용 가능')))
    probe.listen(port, '127.0.0.1')
  })
}

console.log('Haven 로컬 환경 점검')
console.log(`현재 디렉터리: ${process.cwd()}`)
console.log('')

let missing = 0
for (const [name, purpose] of required) {
  const value = process.env[name]?.trim() || ''
  const optional = name === 'KAKAO_REST_API_KEY'
  if (!value && !optional) missing += 1
  console.log(`${value ? '✓' : optional ? '△' : '✗'} ${name}: ${mask(value)} — ${purpose}${optional ? ' / 선택' : ''}`)
}

const apiPort = Number(process.env.PORT || 8787)
console.log(`\nAPI 포트 ${apiPort}: ${await checkPort(apiPort)}`)

if (missing > 0) {
  console.log('\n.env가 없거나 필수 값이 비어 있습니다.')
  console.log('프로젝트 루트에서 다음을 실행하세요:')
  console.log('  Copy-Item .env.example .env')
  console.log('그 다음 .env를 열어 공공데이터, 카카오맵, OpenAI 키를 입력하세요.')
  process.exitCode = 1
} else {
  console.log('\n필수 환경변수는 모두 설정되어 있습니다.')
}

if ((await checkPort(apiPort)) === '사용 중') {
  console.log('\n8787 포트가 사용 중입니다. Windows PowerShell에서 확인하세요:')
  console.log('  netstat -ano | findstr :8787')
  console.log('  taskkill /PID <PID> /F')
}
