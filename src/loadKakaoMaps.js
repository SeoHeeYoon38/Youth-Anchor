import { buildKakaoMapSdkUrl } from './kakaoSdk.js'

export const KAKAO_MAP_APP_KEY = import.meta.env.VITE_KAKAO_MAP_APP_KEY

export function loadKakaoMaps() {
  if (!KAKAO_MAP_APP_KEY) return Promise.reject(new Error('missing-key'))
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps)
  if (window.__havenKakaoMapsPromise) return window.__havenKakaoMapsPromise

  window.__havenKakaoMapsPromise = new Promise((resolve, reject) => {
    let timeoutId
    const fail = (error) => {
      window.clearTimeout(timeoutId)
      window.__havenKakaoMapsPromise = null
      document.querySelector('script[data-haven-kakao-map]')?.remove()
      reject(error)
    }
    const finishLoading = () => {
      window.clearTimeout(timeoutId)
      if (!window.kakao?.maps) {
        fail(new Error('sdk-unavailable'))
        return
      }
      window.kakao.maps.load(() => resolve(window.kakao.maps))
    }

    const existingScript = document.querySelector('script[data-haven-kakao-map]')
    if (existingScript && window.kakao?.maps?.load) {
      finishLoading()
      return
    }

    const script = existingScript || document.createElement('script')
    script.addEventListener('load', finishLoading, { once: true })
    script.addEventListener('error', () => fail(new Error('sdk-load-failed')), { once: true })

    if (!existingScript) {
      script.dataset.havenKakaoMap = 'true'
      script.async = true
      script.src = buildKakaoMapSdkUrl(KAKAO_MAP_APP_KEY)
      document.head.appendChild(script)
    }

    timeoutId = window.setTimeout(() => fail(new Error('sdk-timeout')), 12000)
  })

  return window.__havenKakaoMapsPromise
}
