export const shelters = [
  {
    id: 1,
    name: '마음별 청소년쉼터',
    type: '일시쉼터',
    gender: '누구나',
    ages: '9~24세',
    lat: 37.5668,
    lng: 126.9787,
    address: '서울 중구 세종대로 인근',
    phone: '1388',
    open: '24시간',
    features: ['식사', '샤워', '충전']
  },
  {
    id: 2,
    name: '해봄 여자청소년쉼터',
    type: '단기쉼터',
    gender: '여성',
    ages: '14~24세',
    lat: 37.5742,
    lng: 126.9901,
    address: '서울 종로구 종로 인근',
    phone: '1388',
    open: '24시간',
    features: ['숙박', '상담', '세탁']
  },
  {
    id: 3,
    name: '청소년 이동쉼터 온버스',
    type: '이동쉼터',
    gender: '누구나',
    ages: '9~24세',
    lat: 37.5574,
    lng: 126.9245,
    address: '서울 마포구 홍대입구 인근',
    phone: '1388',
    open: '18:00~01:00',
    features: ['간식', '충전', '상담']
  },
  {
    id: 4,
    name: '다시서기 남자청소년쉼터',
    type: '단기쉼터',
    gender: '남성',
    ages: '14~24세',
    lat: 37.5512,
    lng: 126.9882,
    address: '서울 용산구 후암동 인근',
    phone: '1388',
    open: '24시간',
    features: ['숙박', '식사', '의료 연계']
  }
]

export const supports = [
  {
    id: 1,
    category: '주거',
    title: '자립준비청년 주거지원 통합 안내',
    body: '공공임대 우선공급, 보증금·월세 지원 정보를 한 번에 확인해요.',
    deadline: '상시 신청',
    provider: '공공 주거지원',
    tags: ['만 18~24세', '전국']
  },
  {
    id: 2,
    category: '생활',
    title: '자립수당 및 자립정착금 확인',
    body: '보호종료 시점과 거주 지역에 따라 받을 수 있는 지원을 확인해요.',
    deadline: '상시 신청',
    provider: '복지 지원',
    tags: ['자립준비청년', '소득 무관']
  },
  {
    id: 3,
    category: '일자리',
    title: '청년 맞춤 일경험 프로그램',
    body: '진로 상담부터 직무 체험, 취업 연계까지 단계별로 지원해요.',
    deadline: 'D-12',
    provider: '청년 일자리 지원',
    tags: ['만 15~24세', '교육비 무료']
  },
  {
    id: 4,
    category: '식사',
    title: '오늘 한 끼 지원 지도',
    body: '가까운 무료·할인 식사 제공처와 이용 시간을 찾아보세요.',
    deadline: '매일 업데이트',
    provider: '지역 나눔기관',
    tags: ['누구나', '익명 이용']
  }
]

export const quickReplies = [
  '오늘 잘 곳이 없어요',
  '지금 위험해요',
  '돈과 식사가 필요해요',
  '그냥 이야기하고 싶어요'
]
