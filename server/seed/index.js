import { readFile } from 'node:fs/promises'

/**
 * 공공데이터포털 서비스키가 없을 때만 쓰는 샘플 쉼터 목록.
 *
 * 실제 쉼터 정보로 오해하면 위험하므로 이름과 태그에 '샘플'을 명시해 두었고,
 * 실데이터 동기화가 한 번이라도 성공하면 source='seed' 행은 모두 삭제된다.
 */
export async function loadSeedShelters() {
  const path = new URL('./shelters.json', import.meta.url)
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed.map((shelter) => ({ ...shelter, source: 'seed' })) : []
}
