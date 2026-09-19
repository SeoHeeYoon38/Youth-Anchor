# Haven

위기청소년과 자립준비청년이 가입 없이 대피처, 익명 상담, 긴급 도움, 지원 사업 정보를 이용할 수 있는 모바일 PWA입니다.

프론트엔드는 React Router와 Tailwind CSS로 구성되어 있고, 백엔드는 Node.js HTTP/WebSocket 서버와 SQLite를 사용합니다. 서버는 예시 목록을 자동으로 넣지 않으며 관리자 API 또는 외부 공지 피드에서 저장된 데이터만 반환합니다.

## 로컬 실행

Node.js 22.5 이상이 필요합니다.

```bash
npm install
copy .env.example .env.local
npm run dev
```

- 웹앱: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:8787`
- SQLite: `server/data/haven.db`

## 환경 설정

`.env.example`을 복사한 뒤 다음 값을 설정합니다.

```env
VITE_KAKAO_MAP_APP_KEY=카카오맵_JavaScript_키
HAVEN_JWT_SECRET=충분히_긴_임의_문자열
HAVEN_ADMIN_KEY=관리자_API_전용_키
HAVEN_DB_PATH=server/data/haven.db
HAVEN_NOTICE_FEED_URLS=https://example.org/feed.json
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

운영 환경에서는 `HAVEN_JWT_SECRET`이 없으면 서버가 시작되지 않습니다. 웹 푸시 키는 `npx web-push generate-vapid-keys`로 생성할 수 있습니다.

## 구현된 API

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/v1/auth/guest` | 24시간 익명 JWT 발급 |
| `GET` | `/api/v1/notices` | 공지·지원 사업 목록 |
| `GET` | `/api/v1/notices/{id}` | 공지·지원 사업 상세 |
| `GET` | `/api/v1/shelters/nearby` | 좌표·반경 기준 주변 쉼터 |
| `GET` | `/api/v1/shelters/{id}` | 쉼터 상세 |
| `POST` | `/api/v1/chat/rooms` | 익명 상담방 생성 |
| `WS` | `/api/v1/chat/rooms/{id}/socket` | 실시간 익명 상담 |
| `POST` | `/api/v1/chat/rooms/{id}/messages` | 웹소켓 장애 시 상담 요청 |
| `DELETE` | `/api/v1/chat/rooms/{id}` | 메시지·연결 SOS 데이터 영구 삭제 |
| `POST` | `/api/v1/sos/alerts` | 위치 기반 긴급 알림 접수 |
| `GET` | `/api/v1/notifications/config` | 웹 푸시 공개 설정 |
| `POST` | `/api/v1/notifications/subscribe` | 웹 푸시 구독 저장 |

관리자 데이터 등록과 외부 피드 동기화 방법은 [API 문서](docs/API.md)에 정리되어 있습니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

테스트는 빈 인메모리 SQLite를 사용하여 인증, 공지, 쉼터, HTTP/웹소켓 상담, 퀵 엑시트 삭제, SOS, 푸시 구독을 검증합니다.
