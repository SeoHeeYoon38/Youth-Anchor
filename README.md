# HELPER

위기청소년과 자립준비청년이 로그인 없이 대피처, 익명 상담, 자립지원 정보를 확인할 수 있는 모바일 PWA입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

`npm run dev`는 프론트엔드와 API 서버를 함께 실행합니다.

- 웹앱: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`

## 카카오맵 설정

1. `.env.example`을 참고해 프로젝트 루트에 `.env.local`을 만듭니다.
2. 카카오 개발자 콘솔에서 발급한 JavaScript 키를 입력합니다.
3. 카카오 앱의 Web 플랫폼에 로컬 주소와 실제 배포 주소를 등록합니다.

```env
VITE_KAKAO_MAP_APP_KEY=your_javascript_key
```

키가 없어도 대피처 목록은 이용할 수 있으며, 키를 연결하면 지도와 마커가 표시됩니다.

## API

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/health` | 서버 상태 확인 |
| `GET` | `/api/shelters` | 위치·성별·유형별 대피처 조회 |
| `GET` | `/api/supports` | 분야별 자립지원 조회 |
| `POST` | `/api/chat` | 저장하지 않는 상담 응답 |

현재 대피처 잔여석과 지원정보는 기능 검증용 예시 데이터입니다. 운영 전 공공데이터 및 기관 시스템 연동이 필요합니다.

## 검증

```bash
npm test
npm run lint
npm run build
```
