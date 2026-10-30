import assert from 'node:assert/strict'
import test from 'node:test'
import { buildKakaoDirectionsUrl, geolocationErrorMessage, requestCurrentPosition } from './kakaoDirections.js'

const shelter = {
  name: '서울 청소년 쉼터',
  lat: 37.51,
  lng: 127.02
}

test('카카오맵 길찾기에 현재 위치와 쉼터를 출발지와 도착지로 넣는다', () => {
  const url = buildKakaoDirectionsUrl({
    shelter,
    origin: { lat: 37.5, lng: 127 },
    originName: '현재 위치'
  })

  assert.equal(
    url,
    'https://m.map.kakao.com/scheme/route?sp=37.5,127&ep=37.51,127.02&by=car'
  )
})

test('현재 위치를 얻지 못해도 쉼터를 도착지로 넣는다', () => {
  const url = buildKakaoDirectionsUrl({ shelter, origin: null })

  assert.equal(
    url,
    'https://map.kakao.com/link/to/%EC%84%9C%EC%9A%B8%20%EC%B2%AD%EC%86%8C%EB%85%84%20%EC%89%BC%ED%84%B0,37.51,127.02'
  )
})

test('브라우저 위치 좌표를 길찾기 형식으로 변환한다', async () => {
  const geolocation = {
    getCurrentPosition(success, _failure, options) {
      assert.equal(options.enableHighAccuracy, true)
      success({ coords: { latitude: 37.55, longitude: 126.98 } })
    }
  }

  assert.deepEqual(await requestCurrentPosition(geolocation), { lat: 37.55, lng: 126.98 })
})

test('위치 권한 오류를 사용자가 해결할 수 있는 안내로 바꾼다', () => {
  assert.match(geolocationErrorMessage({ code: 1 }), /사이트 설정에서 위치를 허용/)
  assert.match(geolocationErrorMessage({ code: 2 }), /위치 서비스를 켠 뒤/)
  assert.match(geolocationErrorMessage({ code: 3 }), /시간이 초과/)
})
