import directory from './official-shelter-ids.json' with { type: 'json' }
import { shelterStatusRegion } from '../../shared/shelterStatus.js'

// KYCI의 공개 기관 ID에 공공데이터 파일·API에서 대조한 같은 지역의 시설명을 연결한다.
const key = (region, name) => `${region}:${name.replace(/\s+/g, '')}`
const byName = new Map()
for (const { region, id, names } of directory) {
  for (const name of names) byName.set(key(region, name), { region, id, name: names[0] })
}

export function officialShelterRef(shelter) {
  return byName.get(key(shelterStatusRegion(shelter), shelter.name)) || null
}

// 두 공공데이터 목록에 없는 기관. 좌표는 KYCI가 게시한 안내 주소 기준이다.
const supplements = [
  { id: 'ic06', name: '인천남자중장기청소년쉼터별마루', type: '중장기쉼터', gender: '남성', entryTarget: '남자', capacity: 10,
    address: '인천 연수구 원인재로 156 (연수동)', region: '인천광역시 연수구', lat: 37.4116828683314, lng: 126.681545964404, phone: '032-875-7718' },
  { id: 'kw10', name: '강릉시여자단기청소년쉼터', type: '단기쉼터', gender: '여성', entryTarget: '여자', capacity: 16,
    address: '강원특별자치도 강릉시 금성로 28-2 (금학동), 2층', region: '강원특별자치도 강릉시', lat: 37.7541273075641, lng: 128.897273964123, phone: '033-655-1424' }
]

export function ensureOfficialShelters(repository) {
  const primaryIds = new Set(repository.listShelters().filter(s => s.source !== 'kyci-shelter').map(s => s.officialStatus?.id))
  for (const shelter of supplements) {
    const externalId = `kyci:${shelter.id}`
    if (primaryIds.has(shelter.id)) {
      repository.removeShelterByExternalId(externalId)
    } else {
      repository.upsertShelter({ ...shelter, externalId, source: 'kyci-shelter', open: '운영시간 전화 확인' })
    }
  }
}
