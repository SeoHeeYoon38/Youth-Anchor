const VERIFIED_AT = '2026-11-13'

const DEFAULT_CHECKLIST = [
  '제출처가 요구하는 서류 이름과 종류를 먼저 확인해요.',
  '주민등록번호 뒷자리 등 표시 범위는 꼭 필요한 만큼만 선택해요.',
  '발급일 기준과 유효기간을 제출처에 미리 확인해요.'
]

function documentEntry({
  id,
  title,
  shortTitle = title,
  category,
  tone,
  icon,
  summary,
  uses,
  onlineUrl = null,
  onlineLabel = '온라인 발급 안내',
  onlineNote = '본인인증 후 신청할 수 있어요.',
  visitLabel = '가까운 주민센터',
  visitNote = '방문 전 신분증과 접수 가능 여부를 확인해요.',
  kioskLabel = '',
  kioskNote = '',
  eligibility = '본인 발급이 기본이에요. 대리 발급은 서류별 신청 자격을 확인해 주세요.',
  proxyNote = '대리 신청 시 위임장과 신청인·대리인 신분증이 필요할 수 있어요.',
  checklist = DEFAULT_CHECKLIST,
  sourceLabel = '정부24 공식 발급 안내',
  sourceUrl = onlineUrl
}) {
  return {
    id,
    title,
    shortTitle,
    category,
    tone,
    icon,
    detail: {
      eyebrow: `${category} · 필요한 서류`,
      title,
      summary,
      uses,
      issuance: {
        online: onlineUrl ? { label: onlineLabel, url: onlineUrl, note: onlineNote } : null,
        visit: visitLabel ? { label: visitLabel, note: visitNote } : null,
        kiosk: kioskLabel ? { label: kioskLabel, note: kioskNote } : null
      },
      eligibility,
      proxyNote,
      checklist,
      sourceLabel,
      sourceUrl,
      verifiedAt: VERIFIED_AT
    }
  }
}

export const RIGHTS_DOCUMENTS = Object.freeze([
  documentEntry({
    id: 'resident', title: '주민등록등본·초본', shortTitle: '주민등록\n등본·초본', category: '생활', tone: 'resident', icon: 'rights-book-resident.svg',
    summary: '현재 주소와 세대 구성, 주소 변동 기록 등을 확인하는 가장 기본적인 생활 서류예요.',
    uses: ['청년 월세 지원', '집 계약', '지원금 신청'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13100000015&HighCtgCD=A01010001&tp_seq=01&Mcode=10200',
    onlineLabel: '정부24에서 발급하기',
    onlineNote: '인터넷 발급은 무료이며 공동·간편 인증이 필요할 수 있어요.',
    kioskLabel: '무인민원발급기', kioskNote: '기기별 운영시간과 설치 장소를 확인해요.'
  }),
  documentEntry({
    id: 'family', title: '가족관계증명서', shortTitle: '가족관계\n증명서', category: '생활', tone: 'family', icon: 'rights-book-family.svg',
    summary: '부모·배우자·자녀 등 가족관계를 증명할 때 쓰는 서류예요. 제출처에 따라 일반·상세·특정을 골라요.',
    uses: ['복지 신청', '가족관계 확인', '대리 신청'],
    onlineUrl: 'https://efamily.scourt.go.kr/govEfLink.html?menuFg=02', onlineLabel: '전자가족관계등록시스템에서 발급하기',
    visitLabel: '가까운 주민센터', kioskLabel: '무인민원발급기', kioskNote: '일부 증명서는 무인발급기에서 발급할 수 있어요.',
    sourceLabel: '대한민국 법원 전자가족관계등록시스템'
  }),
  documentEntry({
    id: 'basic', title: '기본증명서', shortTitle: '기본증명서', category: '생활', tone: 'basic', icon: 'rights-book-basic.svg',
    summary: '출생, 개명, 친권 등 본인에 관한 가족관계등록 사항을 증명하는 서류예요.',
    uses: ['본인 정보 확인', '청소년 지원', '친권 확인'],
    onlineUrl: 'https://efamily.scourt.go.kr/govEfLink.html?menuFg=02', onlineLabel: '전자가족관계등록시스템에서 발급하기',
    sourceLabel: '대한민국 법원 전자가족관계등록시스템'
  }),
  documentEntry({
    id: 'health', title: '건강보험 자격득실확인서', shortTitle: '건강보험\n자격득실\n확인서', category: '지원', tone: 'health', icon: 'rights-book-health.svg',
    summary: '건강보험 가입과 자격 변동 내역을 확인하는 서류예요. 재직·소득 확인을 보조할 때도 사용돼요.',
    uses: ['취업 서류', '지원금 신청', '가입 이력 확인'],
    onlineUrl: 'https://plus.gov.kr/search/searchdtl?srvcId=PG4CADM0107&typeSn=01', onlineLabel: '정부24에서 발급 안내 보기',
    visitLabel: '국민건강보험공단 지사', visitNote: '방문 전 1577-1000으로 준비물을 확인해요.'
  }),
  documentEntry({
    id: 'income', title: '소득금액증명원', shortTitle: '소득금액\n증명원', category: '지원', tone: 'income', icon: 'rights-book-income.svg',
    summary: '종합소득이나 연말정산 소득 금액을 공식적으로 증명하는 국세 서류예요.',
    uses: ['주거 지원', '장학금', '금융·복지 신청'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=12100000021&HighCtgCD=A-09002&FAX_TYPE=N&img=02&tp_seq=01&Mcode=10211',
    onlineLabel: '정부24에서 발급하기', visitLabel: '세무서 또는 주민센터', kioskLabel: '무인민원발급기', kioskNote: '발급 가능한 귀속연도를 먼저 확인해요.'
  }),
  documentEntry({
    id: 'protection', title: '보호종료확인서', shortTitle: '보호종료\n확인서', category: '주거', tone: 'protection', icon: 'rights-book-coverage.svg',
    summary: '아동복지시설·가정위탁 보호가 종료되었음을 확인하는 서류예요. 자립준비청년 지원 신청에 쓰여요.',
    uses: ['자립정착금', '주거 지원', '자립수당'],
    visitLabel: '보호를 담당한 시설·가정위탁지원센터', visitNote: '보호 종료를 담당했던 기관이나 관할 시·군·구에 문의해요.',
    eligibility: '보호 종료 당사자가 발급 대상이에요. 기관마다 확인 절차가 다를 수 있어요.',
    proxyNote: '담당 기관에 본인 확인 방법과 대리 신청 가능 여부를 먼저 물어봐요.',
    sourceLabel: '아동권리보장원 자립정보ON', sourceUrl: 'https://jaripon.ncrc.or.kr/'
  }),
  documentEntry({
    id: 'bank', title: '통장 사본', shortTitle: '통장 사본', category: '지원', tone: 'basic', icon: 'rights-book-basic.svg',
    summary: '지원금이나 급여를 받을 계좌의 예금주와 계좌번호를 확인하는 자료예요.',
    uses: ['지원금 수령', '급여 계좌', '환급 신청'],
    visitLabel: '이용 중인 은행', visitNote: '은행 앱의 통장사본·계좌개설확인서 메뉴에서도 저장할 수 있어요.',
    eligibility: '계좌 명의자 본인의 자료를 준비해요.', proxyNote: '주민등록번호와 잔액 등 제출에 불필요한 정보는 가려도 되는지 제출처에 확인해요.',
    sourceLabel: '이용 금융기관 공식 안내', sourceUrl: null
  }),
  documentEntry({
    id: 'lease', title: '임대차계약서', shortTitle: '임대차\n계약서', category: '주거', tone: 'resident', icon: 'rights-book-resident.svg',
    summary: '집을 빌린 조건과 임대인·임차인, 보증금, 기간을 확인하는 계약 서류예요.',
    uses: ['월세 지원', '전입 신고', '주거급여'],
    visitLabel: '계약 당사자 또는 중개사무소', visitNote: '서명·날인된 원본이나 사본을 준비하고 주소와 계약기간을 확인해요.',
    eligibility: '계약 당사자가 보관한 계약서를 사용해요.', proxyNote: '계약서를 잃어버렸다면 임대인이나 중개사무소에 사본 보유 여부를 문의해요.',
    sourceLabel: '국토교통부 부동산거래관리시스템', sourceUrl: 'https://rtms.molit.go.kr/'
  }),
  documentEntry({
    id: 'enrollment', title: '재학증명서', shortTitle: '재학\n증명서', category: '생활', tone: 'family', icon: 'rights-book-family.svg',
    summary: '현재 학교에 재학 중임을 확인하는 서류예요.',
    uses: ['장학금', '청소년 지원', '아르바이트 서류'],
    visitLabel: '재학 중인 학교 행정실', visitNote: '학교 홈페이지의 증명서 발급 메뉴도 함께 확인해요.',
    sourceLabel: '재학 중인 학교 공식 발급 안내', sourceUrl: null
  }),
  documentEntry({
    id: 'graduation', title: '졸업증명서', shortTitle: '졸업\n증명서', category: '생활', tone: 'health', icon: 'rights-book-health.svg',
    summary: '학교를 졸업했거나 졸업 예정임을 증명하는 서류예요.',
    uses: ['취업', '진학', '자격 신청'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?HighCtgCD=A05004;A04002;A04001&CappBizCD=13404000009&tp_seq=03',
    onlineLabel: '정부24에서 발급 안내 보기', visitLabel: '졸업한 학교 또는 주민센터'
  }),
  documentEntry({
    id: 'employment', title: '근로계약서', shortTitle: '근로\n계약서', category: '일자리', tone: 'income', icon: 'rights-book-income.svg',
    summary: '임금, 근무시간, 휴일 등 일하는 조건을 적은 계약서예요. 고용주가 서면으로 교부해야 해요.',
    uses: ['임금 확인', '노동 상담', '근무조건 확인'],
    visitLabel: '근무 중인 사업장', visitNote: '받지 못했다면 고용주에게 서면 교부를 요청하고 1350에 상담할 수 있어요.',
    eligibility: '근로계약을 맺은 근로자는 나이와 상관없이 계약서 사본을 받을 권리가 있어요.',
    sourceLabel: '고용노동부 노동포털', sourceUrl: 'https://labor.moel.go.kr/'
  }),
  documentEntry({
    id: 'career', title: '경력증명서', shortTitle: '경력\n증명서', category: '일자리', tone: 'protection', icon: 'rights-book-coverage.svg',
    summary: '근무한 기간과 담당 업무 등 경력을 확인하는 서류예요.',
    uses: ['취업', '이직', '경력 인정'],
    visitLabel: '근무했던 사업장', visitNote: '사업장 인사 담당자에게 필요한 기재 항목과 발급 형식을 알려줘요.',
    sourceLabel: '근무 사업장 발급', sourceUrl: null
  }),
  documentEntry({
    id: 'beneficiary', title: '국민기초생활수급자 증명서', shortTitle: '기초생활\n수급자\n증명서', category: '지원', tone: 'health', icon: 'rights-book-health.svg',
    summary: '국민기초생활보장 수급 자격을 증명하는 서류예요.',
    uses: ['복지 지원', '수수료 감면', '장학금'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14600000280&Mcode=10020&srhQuery=2023',
    onlineLabel: '정부24에서 발급하기', visitLabel: '주민센터', kioskLabel: '무인민원발급기', kioskNote: '기기별 발급 가능 여부를 확인해요.'
  }),
  documentEntry({
    id: 'near-poverty', title: '차상위계층 확인서', shortTitle: '차상위계층\n확인서', category: '지원', tone: 'basic', icon: 'rights-book-basic.svg',
    summary: '차상위계층 확인 자격을 보유하고 있음을 증명하는 서류예요.',
    uses: ['복지 지원', '교육비 감면', '주거 지원'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13520000098&HighCtgCD=A05003',
    onlineLabel: '정부24에서 발급하기', visitLabel: '주민센터'
  }),
  documentEntry({
    id: 'single-parent', title: '한부모가족 증명서', shortTitle: '한부모가족\n증명서', category: '지원', tone: 'family', icon: 'rights-book-family.svg',
    summary: '한부모가족지원법에 따른 보호대상자임을 증명하는 서류예요.',
    uses: ['한부모 지원', '주거 지원', '교육비 감면'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=10601000001',
    onlineLabel: '정부24에서 발급하기', visitLabel: '주민센터', kioskLabel: '무인민원발급기', kioskNote: '인터넷·모바일·무인발급기 발급을 지원해요.'
  }),
  documentEntry({
    id: 'disability', title: '장애인증명서', shortTitle: '장애인\n증명서', category: '지원', tone: 'protection', icon: 'rights-book-coverage.svg',
    summary: '등록 장애인임을 서면으로 증명할 때 사용하는 서류예요.',
    uses: ['복지 서비스', '세금·요금 감면', '지원 신청'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=14600000273&HighCtgCD=A05001&tp_seq=01',
    onlineLabel: '정부24에서 발급하기', visitLabel: '주민센터', kioskLabel: '무인민원발급기', kioskNote: '온라인 대리 신청은 지원되지 않아요.'
  }),
  documentEntry({
    id: 'health-payment', title: '건강보험료 납부확인서', shortTitle: '건강보험료\n납부확인서', category: '지원', tone: 'income', icon: 'rights-book-income.svg',
    summary: '건강보험료를 납부한 내역을 확인하는 서류예요. 소득 수준을 확인하는 보조 자료로도 쓰여요.',
    uses: ['장학금', '주거 지원', '소득 확인'],
    onlineUrl: 'https://plus.gov.kr/search/searchdtl/?srvcId=SG4CADM2017&typeSn=01',
    onlineLabel: '정부24에서 발급 안내 보기', visitLabel: '국민건강보험공단 지사'
  }),
  documentEntry({
    id: 'school-record', title: '학교생활기록부', shortTitle: '학교생활\n기록부', category: '생활', tone: 'family', icon: 'rights-book-family.svg',
    summary: '유치원·초·중·고등학교의 학적과 학교생활 기록을 증명하는 서류예요.',
    uses: ['진학', '취업', '학적 확인'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13410000019&HighCtgCD=A04001',
    onlineLabel: '정부24에서 발급하기', visitLabel: '학교·교육청·주민센터', kioskLabel: '무인민원발급기', kioskNote: '졸업연도 등에 따라 발급 가능 범위가 달라요.'
  }),
  documentEntry({
    id: 'ged', title: '검정고시 합격증명서', shortTitle: '검정고시\n합격증명서', category: '생활', tone: 'basic', icon: 'rights-book-basic.svg',
    summary: '초·중·고졸 검정고시 합격 사실을 증명하는 서류예요.',
    uses: ['진학', '취업', '학력 확인'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13404000021&tp_seq=02',
    onlineLabel: '정부24에서 발급하기', visitLabel: '교육청·교육지원청·주민센터', kioskLabel: '무인민원발급기'
  }),
  documentEntry({
    id: 'military', title: '병적증명서', shortTitle: '병적\n증명서', category: '일자리', tone: 'resident', icon: 'rights-book-resident.svg',
    summary: '병역 이행 여부와 복무 사항을 확인하는 서류예요. 일부 대상은 병역사항이 포함된 주민등록초본으로 대신할 수 있어요.',
    uses: ['취업', '공공기관 제출', '병역 확인'],
    onlineUrl: 'https://www.gov.kr/mw/AA020InfoCappView.do?CappBizCD=13000000016&HighCtgCD=A01002&tp_seq=02',
    onlineLabel: '정부24에서 발급하기', visitLabel: '주민센터·지방병무청', kioskLabel: '무인민원발급기'
  })
])

export const RIGHTS_DOCUMENT_DETAILS = Object.freeze(Object.fromEntries(RIGHTS_DOCUMENTS.map((item) => [item.id, item.detail])))

export function filterRightsDocuments({ category = '전체', query = '' } = {}) {
  const cleanQuery = String(query).trim().toLocaleLowerCase('ko-KR')
  return RIGHTS_DOCUMENTS.filter((document) => (category === '전체' || document.category === category) && (!cleanQuery || document.title.toLocaleLowerCase('ko-KR').includes(cleanQuery)))
}

export function getRightsDocument(id) {
  return RIGHTS_DOCUMENTS.find((document) => document.id === id) || null
}
