# Haven API 운영 가이드

## 인증

`POST /api/v1/auth/guest`에서 받은 토큰을 이후 요청의 `Authorization: Bearer <token>` 헤더에 넣습니다. 토큰과 서버 세션은 24시간 후 만료됩니다.

관리자 API는 별도로 `X-Admin-Key` 헤더가 필요합니다. 운영 환경에서는 반드시 `HAVEN_ADMIN_KEY`를 설정해야 합니다.

## 관리자 데이터 등록

### 공지 및 지원 사업

`POST /api/v1/admin/notices`

```json
{
  "kind": "support",
  "category": "식사",
  "title": "청소년 식사 지원",
  "summary": "지원 내용을 짧게 설명합니다.",
  "content": "지원 자격과 신청 방법을 작성합니다.",
  "eligibility": ["만 9~24세"],
  "benefits": ["식사 지원"],
  "tags": ["청소년", "서울"],
  "applicationUrl": "https://example.org/apply",
  "provider": "운영 기관",
  "deadline": "상시"
}
```

`kind`는 일반 공지면 `notice`, 지원 사업이면 `support`를 사용합니다.

### 쉼터

`POST /api/v1/admin/shelters`

```json
{
  "name": "청소년쉼터",
  "type": "일시쉼터",
  "gender": "누구나",
  "ages": "9~24세",
  "lat": 37.5665,
  "lng": 126.978,
  "address": "서울특별시 중구",
  "phone": "1388",
  "open": "24시간",
  "features": ["숙박", "식사", "상담"]
}
```

잔여석은 운영 데이터의 신뢰성을 보장하기 어려워 저장하거나 노출하지 않습니다. 사용자는 출발 전 1388로 입소 가능 여부를 확인하도록 안내됩니다.

## 공공데이터포털 연동

프런트엔드는 외부 API를 직접 부르지 않습니다. 백엔드가 매일 새벽에 공공데이터포털을 호출해 SQLite에 저장(Sync)하고, 앱에는 자체 DB 값만 내려줍니다. 외부 API가 죽어도 마지막 수집 데이터로 서비스가 계속 동작합니다.

### 필요한 활용신청 목록

| 용도 | 데이터 | 엔드포인트 | 심의 |
| --- | --- | --- | --- |
| `GET /shelters/nearby` | [성평등가족부_청소년쉼터](https://www.data.go.kr/data/15109778/openapi.do) (15109778) | `apis.data.go.kr/1383000/gmis/teenRAreaServiceV2/getTeenRAreaListV2` | 자동승인 |
| `GET /notices` | [한국사회보장정보원_중앙부처복지서비스](https://www.data.go.kr/data/15090532/openapi.do) (15090532) | `apis.data.go.kr/B554287/NationalWelfareInformationsV001/NationalWelfarelistV001` (+ `NationalWelfaredetailedV001`) | 자동승인 |

두 데이터 모두 **REST 유형**이라 공공데이터포털 계정의 일반 인증키 하나로 호출됩니다. 활용신청 후 `DATA_GO_KR_SERVICE_KEY` 한 개만 채우면 됩니다. 승인 직후에는 키가 아직 전파되지 않아 `SERVICE_KEY_IS_NOT_REGISTERED_ERROR`가 날 수 있으며 최대 1시간 정도 기다려야 합니다.

### 수집 내용

청소년쉼터 응답에는 위도(`lat`)·경도(`lot`)가 포함되어 지도에 바로 표시됩니다. 좌표가 빈 행은 `KAKAO_REST_API_KEY`가 설정된 경우 주소 기반 지오코딩으로 보정하고, 그래도 좌표를 못 구하면 저장하지 않습니다. 시설명·입소대상 문구에서 이용 대상 성별과 연령대를 추론하고, 시설유형은 `일시쉼터 / 단기쉼터 / 중장기쉼터 / 이동쉼터`로 정리합니다.

복지서비스는 생애주기 코드 `003`(청소년)·`004`(청년)로 목록을 가져온 뒤 상세 조회를 덧붙여 지원 자격(`eligibility`)과 급여 내용(`benefits`)을 채웁니다. 카테고리는 앱의 탭 구성에 맞춰 `주거 / 생활 / 일자리 / 식사`로 분류합니다. 복지서비스는 마감일 대신 지원주기를 제공하므로 임의의 마감일을 만들지 않고 `상시 신청` 또는 `월 지원` 형태로 표시합니다.

### 실행 방법

```bash
npm run sync            # 쉼터 + 지원사업 전체 동기화
npm run sync:shelters   # 쉼터만
npm run sync:notices    # 지원사업/공지만
```

서버가 떠 있으면 매일 한국시간 `HAVEN_SYNC_HOUR_KST:HAVEN_SYNC_MINUTE_KST`(기본 04:10)에 자동 실행됩니다. 수동 실행과 상태 확인은 관리자 API를 사용합니다.

- `POST /api/v1/admin/sync` — 전체 동기화. `?target=shelters` 또는 `?target=notices`로 범위를 좁힐 수 있습니다.
- `GET /api/v1/admin/sync/status` — 키 설정 여부, 엔드포인트, 스케줄, 마지막 실행 결과.
- `GET /api/health` — 현재 쉼터·공지 건수와 마지막 동기화 결과를 함께 반환합니다.

### 서비스키 없이도 동작하는 실데이터

같은 데이터의 **파일데이터 버전**은 인증키 없이 내려받을 수 있어, 전국 청소년쉼터 137곳을 리포지터리에 동봉해 두었습니다. 서비스키를 발급받기 전에도 첫 실행부터 실제 시설명·주소·대표전화로 동작합니다.

- 출처: [성평등가족부_청소년쉼터 현황](https://www.data.go.kr/data/3084536/fileData.do) (2025년 3월 기준)
- 저장 위치: `server/seed/shelters.json` (`source: "mogef-file"`)
- 갱신: `node scripts/build-shelter-seed.mjs` — CSV를 다시 받아 좌표까지 새로 만듭니다.

원본 파일에는 좌표가 없어 OpenStreetMap Nominatim으로 지오코딩했습니다. 137곳 중 128곳은 건물·도로 단위로 좌표를 찾았고, 9곳은 시군구 단위까지만 찾아 `위치 대략 표시` 태그가 붙습니다. 시설유형 값(`단기쉼터(여자)` 등)에 이용 대상 성별이 포함되어 있어 성별은 추론이 아닌 원본 값을 씁니다.

오픈API 동기화가 성공하면 더 최신인 API 데이터로 교체되고(`source: "mogef-teen-shelter"`), 동봉 데이터 행은 삭제됩니다.

### 연동하지 못한 API

| 데이터 | 문제 |
| --- | --- |
| 온통청년 청년정책 API | 공공데이터포털에 `LINK` 유형으로만 등록되어 있어 온통청년 사이트에서 별도 수동 승인을 받아야 합니다. 승인 후 `HAVEN_YOUTH_POLICY_ENDPOINT`·`HAVEN_YOUTH_POLICY_KEY`를 채우면 지원 목록에 함께 수집됩니다(필드명 변형을 허용하는 정규화기가 준비되어 있습니다). |
| 경찰청_아동안전지킴이집 | 공공데이터포털 등록분(`3052084`, `15057866`)이 모두 `LINK` 유형이라 호출 가능한 REST 엔드포인트가 없습니다. 안전Dream 쪽 별도 제공 협의가 필요하며, 현재 대피처 목록은 청소년쉼터만으로 구성됩니다. |
| 쉼터 실시간 잔여석 | 잔여석을 제공하는 공개 API가 없습니다. 오픈API의 `정원수`는 수집해 `capacity`로 보관하지만, 실시간 잔여석이 아니므로 화면에는 노출하지 않습니다. |

### 추가 JSON 피드

`HAVEN_NOTICE_FEED_URLS`에 JSON 피드 URL을 쉼표로 구분해 설정하면 동기화 때 함께 갱신됩니다. 피드는 배열 자체이거나 `items`, `data`, `results` 중 하나에 배열을 포함할 수 있습니다. 각 항목은 최소한 `id`와 `title`을 제공해야 하며 `category`, `description`, `content`, `provider`, `deadline`, `url` 등을 함께 사용할 수 있습니다. 이 피드만 따로 갱신할 때는 `POST /api/v1/admin/notices/sync`를 사용합니다.

## 실시간 상담

상담방 생성 응답의 `socketPath`에 웹소켓으로 연결합니다. 브라우저 웹소켓 제약 때문에 게스트 토큰은 `token` 쿼리에 URL 인코딩하여 전달합니다. 운영에서는 반드시 HTTPS/WSS를 사용하고 프록시 접근 로그에서 쿼리 문자열을 마스킹해야 합니다.

클라이언트 메시지:

```json
{ "type": "message", "text": "오늘 잘 곳이 없어요" }
```

서버 응답:

```json
{ "type": "reply", "reply": "...", "actions": ["find-shelter", "call-1388"] }
```

## 긴급 종료

`DELETE /api/v1/chat/rooms/{room_id}`는 해당 상담방의 메시지와 연결된 SOS 위치 데이터를 하나의 트랜잭션에서 삭제합니다. 서버는 별도의 HTTP 접근 로그를 저장하지 않습니다. 리버스 프록시를 사용하는 경우에도 상담·SOS 경로의 접근 로그를 비활성화하거나 즉시 파기하도록 운영 설정이 필요합니다.
