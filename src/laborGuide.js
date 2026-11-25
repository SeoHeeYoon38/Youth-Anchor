export const laborTopics = [
  {
    id: 'labor-contract', title: '근로계약서 확인하기',
    body: '일을 시작할 때 임금, 일하는 시간, 휴일 등 약속한 조건을 적는 문서예요. 서명하기 전에 실제로 일하기로 한 조건과 맞는지 확인하고, 작성한 계약서 한 부를 받아 보관하세요.',
    source: '고용노동부 표준근로계약서 서식', url: 'https://www.moel.go.kr/policy/policydata/view.do?bbs_seq=20250300356'
  },
  {
    id: 'labor-age', title: '일할 수 있는 나이 확인하기',
    body: '원칙적으로 만 15세부터 일할 수 있어요. 만 15세 미만이거나 만 18세 미만이면서 중학교에 재학 중이라면 취직인허증이 필요해요. 만 18세 미만을 고용하는 사업주는 나이를 증명하는 가족관계 기록과 친권자 또는 후견인의 동의서를 갖춰야 해요.',
    source: '근로기준법 제64조', url: 'https://www.law.go.kr/법령/근로기준법/제64조'
  },
  {
    id: 'labor-hours', title: '일할 수 있는 시간 확인하기',
    body: '만 15세 이상 18세 미만은 하루 7시간, 한 주 35시간까지 일하는 것이 원칙이에요. 서로 합의한 경우에도 연장할 수 있는 시간은 하루 1시간, 한 주 5시간까지예요.',
    source: '근로기준법 제69조', url: 'https://www.law.go.kr/법령/근로기준법/제69조'
  },
  {
    id: 'labor-wages', title: '임금이 밀렸을 때 대처 방법 알아보기',
    body: '일한 날짜와 시간, 약속한 급여, 실제로 받은 금액을 적어 두세요. 근로계약서, 근무표, 급여 입금 내역이나 메시지가 있으면 함께 모아 두세요. 고용노동부 노동포털에서 임금체불 진정을 신청하거나 사업장 관할 노동관서에 문의할 수 있어요.',
    source: '고용노동부 임금체불 신고 안내', url: 'https://labor.moel.go.kr/minwonSysInfo/wagesolway.do'
  },
  {
    id: 'labor-counseling', title: '청소년근로보호센터 상담 방법 확인하기',
    phone: '1599-0924',
    body: '일하면서 겪은 부당한 대우나 밀린 임금에 관해 상담할 수 있어요. 전화 상담은 평일 오전 9시부터 오후 6시까지예요. 낮 12시부터 오후 1시까지는 점심시간이에요.',
    source: '성평등가족부 청소년 근로권익 보호', url: 'https://www.mogef.go.kr/sp/yth/sp_yth_f012.do'
  }
]

export const laborStarterCollection = {
  id: 'youth-labor-guide',
  title: '아르바이트 시작하기',
  category: '일자리',
  documentIds: laborTopics.map((topic) => topic.id),
  checkedDocumentIds: []
}
