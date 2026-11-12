const ASSET_ROOT = '/figma/features'

export const LEGAL_TOPICS = Object.freeze([
  { id: 'labor', title: '노동권 보호', description: '알바하면서 부당한 대우를 받았을 때 선택하세요', icon: `${ASSET_ROOT}/legal-briefcase.svg`, tone: 'labor' },
  { id: 'school', title: '학교폭력 대응', description: '학교 안팎에서 괴롭힘을 당했을 때 선택하세요', icon: `${ASSET_ROOT}/legal-graduation.svg`, tone: 'school' },
  { id: 'digital', title: '디지털 범죄 대응', description: '온라인 협박이나 사진 유포 피해를 당했을 때 선택하세요', icon: `${ASSET_ROOT}/legal-smartphone.svg`, tone: 'digital' },
  { id: 'family', title: '가정폭력·아동학대', description: '가정에서 안전을 위협받을 때 선택하세요', icon: `${ASSET_ROOT}/legal-home-heart.svg`, tone: 'family' },
  { id: 'money', title: '금전·사기 피해', description: '온라인 사기나 돈을 빼앗겼을 때 선택하세요', icon: `${ASSET_ROOT}/legal-dollar.svg`, tone: 'money' }
])

export const LEGAL_GUIDES = Object.freeze({
  labor: {
    title: '노동권 보호',
    initialMessage: '알바하면서 힘든 일이 있었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['돈을 덜 받았어요', '갑자기 잘렸어요', '다쳤어요', '욕, 폭언을 들었어요'],
    evidenceOptions: ['근로 계약서', '출퇴근 기록, 사진', '문자 기록', '아무것도 없어요'],
    result: '일한 시간만큼 최저임금 이상 받는 건 나이와 상관없는 권리예요. 이제 방법을 알려줄게요.',
    steps: ['증거 화면을 따로 캡처해 저장하기', '일한 날짜와 시간을 일기장에 적기', '고용노동부 1350에 신고 방법 물어보기'],
    checklist: ['근무 기록 캡처 저장하기', '일한 날짜와 시간 적기', '1350에 상담하기'],
    contact: { href: 'tel:1350', label: '1350 전화하기' }
  },
  school: {
    title: '학교폭력 대응',
    initialMessage: '학교 안팎에서 힘든 일이 있었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['친구에게 괴롭힘을 당했어요', '단체로 따돌림을 당했어요', '온라인에서 괴롭힘을 당했어요', '다치거나 위협받았어요'],
    evidenceOptions: ['문자·채팅 기록', '사진·영상', '학교에 알린 기록', '아무것도 없어요'],
    result: '괴롭힘은 참아야 하는 일이 아니에요. 안전을 먼저 지키면서 도움을 요청할 수 있어요.',
    steps: ['메시지와 사진을 지우지 않고 보관하기', '믿을 수 있는 보호자나 교사에게 알리기', '학교폭력 신고·상담 117에 연락하기'],
    checklist: ['학교폭력 기록 보관하기', '믿을 수 있는 어른에게 알리기', '117에 상담하기'],
    contact: { href: 'tel:117', label: '117 전화하기' }
  },
  digital: {
    title: '디지털 범죄 대응',
    initialMessage: '온라인에서 불안한 일을 겪었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['협박을 받았어요', '사진·영상이 퍼졌어요', '계정이 도용됐어요', '온라인 사기를 당했어요'],
    evidenceOptions: ['대화 화면 캡처', '게시물 주소', '결제·송금 기록', '아무것도 없어요'],
    result: '혼자 해결하려고 상대방과 계속 연락하지 않아도 돼요. 증거를 남기고 도움을 요청해요.',
    steps: ['대화와 게시물 화면을 캡처하기', '계정 비밀번호를 바꾸고 신고하기', '긴급하면 112 또는 1388에 연락하기'],
    checklist: ['온라인 피해 화면 저장하기', '계정 보안 확인하기', '전문기관에 상담하기'],
    contact: { href: 'tel:112', label: '112 전화하기' }
  },
  family: {
    title: '가정폭력·아동학대',
    initialMessage: '집에서 안전하지 않은 일을 겪었군요. 지금 상황과 가장 가까운 것을 골라줄래요?',
    issueOptions: ['집에서 맞거나 위협받았어요', '집에 있기가 무서워요', '돌봄을 받지 못하고 있어요', '가족이 위험해요'],
    evidenceOptions: ['다친 곳의 사진', '문자·통화 기록', '도움을 요청한 기록', '아무것도 없어요'],
    result: '무엇보다 지금 안전한 곳으로 이동하는 게 먼저예요. 네 잘못이 아니고 도움을 요청해도 돼요.',
    steps: ['가까운 안전한 장소로 이동하기', '믿을 수 있는 어른에게 알리기', '지금 위험하면 112에 연락하기'],
    checklist: ['안전하게 머물 곳 확인하기', '믿을 수 있는 어른에게 알리기', '112 또는 1388에 상담하기'],
    contact: { href: 'tel:112', label: '112 전화하기' }
  },
  money: {
    title: '금전·사기 피해',
    initialMessage: '돈과 관련해 곤란한 일을 겪었군요. 어떤 일이었는지 선택해줄래요?',
    issueOptions: ['돈을 빌려주고 못 받았어요', '온라인 사기를 당했어요', '내 명의로 결제됐어요', '강제로 돈을 빼앗겼어요'],
    evidenceOptions: ['송금·결제 기록', '대화 화면 캡처', '판매 글·계정 정보', '아무것도 없어요'],
    result: '추가로 돈을 보내거나 상대방과 거래하지 말고, 남아 있는 기록부터 안전하게 보관해요.',
    steps: ['송금과 대화 기록을 캡처하기', '은행이나 결제사에 피해를 알리기', '경찰 112 또는 금융상담 1332에 문의하기'],
    checklist: ['송금·결제 기록 저장하기', '은행·결제사에 알리기', '112 또는 1332에 상담하기'],
    contact: { href: 'tel:1332', label: '1332 전화하기' }
  }
})

export function getLegalGuide(id) {
  return LEGAL_GUIDES[id] || null
}
