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

## 외부 공지 배치

`HAVEN_NOTICE_FEED_URLS`에 JSON 피드 URL을 쉼표로 구분해 설정하면 서버 시작 시와 6시간마다 내용을 SQLite에 갱신합니다. 수동 실행은 `POST /api/v1/admin/notices/sync`를 사용합니다.

피드는 배열 자체이거나 `items`, `data`, `results` 중 하나에 배열을 포함할 수 있습니다. 각 항목은 최소한 `id`와 `title`을 제공해야 하며 `category`, `description`, `content`, `provider`, `deadline`, `url` 등을 함께 사용할 수 있습니다.

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
