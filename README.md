# Haven

위기청소년과 자립준비청년이 가입 없이 대피처, 익명 상담, 긴급 도움, 지원 사업 정보를 이용할 수 있는 모바일 PWA입니다.

프론트엔드는 React Router와 Tailwind CSS로 구성되어 있고, 백엔드는 Node.js HTTP/WebSocket 서버와 SQLite를 사용합니다.

대피처와 지원 사업 정보는 백엔드가 매일 새벽에 공공데이터포털 오픈API를 호출해 자체 DB에 저장하고, 앱에는 자체 DB 값만 내려줍니다. 앱이 외부 API를 직접 부르지 않으므로 외부 서비스가 중단돼도 마지막 수집 데이터로 계속 동작합니다.

| 화면 | 데이터 출처 | 서비스키 없이 동작 |
| --- | --- | --- |
| 대피처 (`/shelters`) | 성평등가족부_청소년쉼터 오픈API | 전국 137곳 동봉 (파일데이터 기반) |
| 자립 지원 (`/support`) | 한국사회보장정보원_중앙부처복지서비스 오픈API | 서비스키 필요 |
| 익명 상담·긴급 SOS | 자체 DB + WebSocket | 동작 |

## 로컬 실행

Node.js 22.5 이상이 필요합니다.

```bash
npm install
cp .env.example .env
npm run dev
```

서버 프로세스는 `--env-file-if-exists=.env`로 `.env`를 읽습니다. `.env`는 `.gitignore` 대상이라 커밋되지 않습니다.

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
DATA_GO_KR_SERVICE_KEY=공공데이터포털_일반_인증키
KAKAO_REST_API_KEY=카카오_REST_API_키
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@example.com
```

운영 환경에서는 `HAVEN_JWT_SECRET`이 없으면 서버가 시작되지 않습니다.

`HAVEN_JWT_SECRET`, `HAVEN_ADMIN_KEY`, VAPID 키페어는 외부 발급 절차 없이 직접 만들 수 있습니다.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # JWT 시크릿
npx web-push generate-vapid-keys                                            # 웹 푸시 키페어
```

`DATA_GO_KR_SERVICE_KEY`와 카카오 키는 본인 계정으로만 발급되므로 아래 절차가 필요합니다.

## 공공데이터 연동 준비

1. [공공데이터포털](https://www.data.go.kr)에 로그인합니다.
2. 아래 두 데이터에서 **활용신청**을 누릅니다. 둘 다 자동승인이라 신청 직후 사용할 수 있습니다.
   - [성평등가족부_청소년쉼터](https://www.data.go.kr/data/15109778/openapi.do)
   - [한국사회보장정보원_중앙부처복지서비스](https://www.data.go.kr/data/15090532/openapi.do)
3. 마이페이지 > 오픈API > 인증키 발급현황에서 **일반 인증키(Decoding)** 를 복사해 `.env`의 `DATA_GO_KR_SERVICE_KEY`에 넣습니다. 두 API가 이 키 하나를 공유합니다.
4. `npm run sync`로 첫 수집을 실행합니다. 이후에는 서버가 매일 한국시간 04:10에 자동으로 갱신합니다.

**서비스키가 없어도 앱은 실데이터로 동작합니다.** 같은 데이터의 파일데이터 버전은 인증키 없이 받을 수 있어, 전국 청소년쉼터 137곳(성평등가족부 2025년 3월 기준)을 `server/seed/shelters.json`에 동봉했습니다. 서비스키를 넣으면 오픈API의 최신 데이터로 교체되고 매일 자동 갱신됩니다.

동봉 데이터를 최신 파일로 다시 만들려면 `node scripts/build-shelter-seed.mjs`를 실행합니다. 자세한 수집 규칙과 연동하지 못한 API 목록은 [API 문서](docs/API.md)에 정리되어 있습니다.

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
| `POST` | `/api/v1/admin/sync` | 공공데이터 수동 동기화 |
| `GET` | `/api/v1/admin/sync/status` | 키 설정·스케줄·마지막 수집 결과 |

관리자 데이터 등록과 공공데이터 동기화 방법은 [API 문서](docs/API.md)에 정리되어 있습니다.

## 검증

```bash
npm test
npm run lint
npm run build
```

테스트는 빈 인메모리 SQLite를 사용하여 인증, 공지, 쉼터, HTTP/웹소켓 상담, 퀵 엑시트 삭제, SOS, 푸시 구독을 검증합니다. 공공데이터 연동은 실제 응답 스키마를 그대로 옮긴 픽스처로 XML/JSON 파싱, 페이지 순회, 좌표 보정, 재실행 시 중복 방지, 인증 오류 처리를 검증합니다.
