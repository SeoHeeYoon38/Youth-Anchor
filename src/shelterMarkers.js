/**
 * 지도 마커 색상 기준.
 *
 * 색을 임의로 돌려쓰지 않고 쉼터 유형(= 머물 수 있는 기간과 긴급도)에 고정한다.
 * 위기 상황에서 "지금 당장 갈 수 있는 곳"과 "오래 머물 수 있는 곳"을 색으로 먼저
 * 구분할 수 있어야 하므로, 긴급도가 높은 쪽을 눈에 띄는 색으로 둔다.
 *
 * 청소년복지지원법상 쉼터 구분을 따른다.
 *   일시쉼터   최대 7일      가장 긴급 → 빨강(SOS)
 *   이동쉼터   현장 상담      찾아오는 보호 → 노랑
 *   단기쉼터   3~9개월       숙박 보호 → 초록
 *   중장기쉼터 최대 4년       자립 준비 → 보라
 */
const MARKER_BY_TYPE = {
  일시쉼터: {
    tone: 'coral',
    symbol: 'SOS',
    label: '일시',
    title: '일시쉼터',
    description: '최대 7일, 지금 바로 긴급 보호'
  },
  이동쉼터: {
    tone: 'yellow',
    symbol: '손',
    label: '이동',
    title: '이동쉼터',
    description: '거리로 찾아오는 현장 상담'
  },
  단기쉼터: {
    tone: 'green',
    symbol: '집',
    label: '단기',
    title: '단기쉼터',
    description: '3~9개월 숙박 보호'
  },
  중장기쉼터: {
    tone: 'purple',
    symbol: '쉼',
    label: '중장기',
    title: '중장기쉼터',
    description: '최대 4년 자립 준비'
  }
}

/** 유형을 알 수 없는 쉼터도 지도에서 빠지지 않도록 기본값을 둔다. */
const FALLBACK_MARKER = {
  tone: 'green',
  symbol: '집',
  label: '쉼터',
  title: '청소년쉼터',
  description: '유형 정보가 없어 전화 확인이 필요해요'
}

/** 쉼터 한 곳에 대응하는 마커 표시 규칙을 돌려준다. */
export function markerStyleFor(shelter) {
  return MARKER_BY_TYPE[shelter?.type] || FALLBACK_MARKER
}

/** 지도 범례에 쓰는 순서. 긴급한 유형을 먼저 보여준다. */
export const MARKER_LEGEND = ['일시쉼터', '이동쉼터', '단기쉼터', '중장기쉼터'].map((type) => ({
  type,
  ...MARKER_BY_TYPE[type]
}))
