export const KYCI_DIRECTORY_URL = 'https://www.kyci.or.kr/Shelter/center_list.new.asp'

// KYCI의 지역 탭이 조회하는 local 값. 행정구역 개칭 전후 표기도 함께 받는다.
const regionTabs = [
  [/^서울/, '서울'], [/^부산/, '부산'], [/^대구/, '대구'], [/^인천/, '인천'],
  [/^광주/, '광주'], [/^대전/, '대전'], [/^울산/, '울산'], [/^경기/, '경기'],
  [/^강원/, '강원'], [/^(충북|충청북)/, '충북'], [/^(충남|충청남)/, '충남'],
  [/^(전북|전라북)/, '전북'], [/^(전남|전라남)/, '전남'],
  [/^(경북|경상북)/, '경북'], [/^(경남|경상남)/, '경남'], [/^제주/, '제주']
]

export function statusRegionName(id) {
  return /^[1-9]\d?$/.test(id) ? regionTabs[Number(id) - 1]?.[1] : undefined
}

export function shelterStatusUrl(shelter) {
  for (const field of [shelter.region, shelter.address]) {
    const region = field?.trim()
    if (!region) continue
    if (/^세종/.test(region)) return '/shelters/status/sejong'
    const index = regionTabs.findIndex(([pattern]) => pattern.test(region))
    if (index >= 0) return `/shelters/status/${index + 1}`
  }
  return KYCI_DIRECTORY_URL
}
