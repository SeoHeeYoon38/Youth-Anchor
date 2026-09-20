import { readFile } from 'node:fs/promises'

export const SEED_SOURCE = 'mogef-file'

/**
 * 전국 청소년쉼터 137곳의 실제 목록.
 *
 * 출처: 공공데이터포털 '성평등가족부_청소년쉼터 현황' 파일데이터(2025년 3월 기준).
 * https://www.data.go.kr/data/3084536/fileData.do
 *
 * 이 파일데이터는 인증키 없이 내려받을 수 있어 서비스키 발급 전에도 실데이터로 동작한다.
 * 원본에 좌표가 없어 주소를 지오코딩해 넣었고, 갱신은 scripts/build-shelter-seed.mjs로 한다.
 * 오픈API 동기화가 성공하면 더 최신인 API 데이터로 대체된다.
 */
export async function loadSeedShelters() {
  const path = new URL('./shelters.json', import.meta.url)
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) return []
  return parsed.map(({ geocodePrecision, ...shelter }) => ({
    ...shelter,
    source: SEED_SOURCE,
    // 시군구 단위로만 좌표를 찾은 곳은 거리 표시가 부정확할 수 있어 태그로 알린다.
    features: geocodePrecision === 'region'
      ? [...(shelter.features || []), '위치 대략 표시']
      : shelter.features || []
  }))
}

/** 마지막으로 정상 수집한 공공 복지서비스 목록. 외부 API 한도 초과 시 빈 화면을 막는다. */
export async function loadSeedNotices() {
  const path = new URL('./notices.json', import.meta.url)
  const raw = await readFile(path, 'utf8')
  const parsed = JSON.parse(raw)
  return Array.isArray(parsed) ? parsed : []
}
