export const KAKAO_MAP_SDK_BASE = 'https://dapi.kakao.com/v2/maps/sdk.js'

export function buildKakaoMapSdkUrl(appKey) {
  if (!appKey) throw new Error('missing-key')
  const url = new URL(KAKAO_MAP_SDK_BASE)
  url.searchParams.set('appkey', appKey)
  url.searchParams.set('autoload', 'false')
  return url.toString()
}
