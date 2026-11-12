import assert from 'node:assert/strict'
import test from 'node:test'
import { buildKakaoMapSdkUrl, KAKAO_MAP_SDK_BASE } from './kakaoSdk.js'

test('Kakao Maps uses the official SDK loader instead of internal CDN resources', () => {
  const url = buildKakaoMapSdkUrl('test key')
  assert.equal(KAKAO_MAP_SDK_BASE, 'https://dapi.kakao.com/v2/maps/sdk.js')
  assert.match(url, /^https:\/\/dapi\.kakao\.com\/v2\/maps\/sdk\.js\?/)
  assert.match(url, /appkey=test\+key/)
  assert.match(url, /autoload=false/)
  assert.doesNotMatch(url, /daumcdn\.net/i)
})

test('Kakao Maps SDK URL requires an application key', () => {
  assert.throws(() => buildKakaoMapSdkUrl(''), /missing-key/)
})
