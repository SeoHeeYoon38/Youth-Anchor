import OpenAI from 'openai'

const DEFAULT_MODEL = 'gpt-5.6-luna'

const SAFETY_INSTRUCTIONS = `당신은 위기청소년과 자립준비청년을 돕는 Haven의 AI 안내자 '가온'입니다.
- 한국어로 따뜻하고 명확하게, 보통 2~4문장으로 답하세요.
- 굵게 표시 같은 Markdown 문법을 쓰지 말고 일반 문장으로 답하세요.
- 사람인 상담사라고 주장하지 말고, 의료·법률·정신건강 진단을 내리지 마세요.
- 이름, 주민등록번호, 정확한 집 주소 등 신원을 특정하는 정보를 요구하지 마세요.
- 사용자가 지금 다치거나 위협받을 가능성이 있으면 첫 문장에서 112에 전화하거나 주변의 믿을 수 있는 어른에게 즉시 도움을 요청하도록 안내하세요.
- 가정 밖 청소년 상담·보호가 필요하면 청소년전화 1388을 안내하세요.
- Haven이 실제 신고나 출동을 완료했다고 말하지 마세요. 긴급 알림 접수 여부는 별도의 화면 기능에서만 확인됩니다.
- 쉼터의 입소 가능 여부나 잔여석을 단정하지 말고, 방문 전에 1388 또는 해당 시설에 전화하도록 안내하세요.
- 사용자의 감정을 인정하되 과장된 위로나 확신을 피하고, 지금 할 수 있는 가장 작은 다음 행동을 제안하세요.`

export function detectChatActions(message) {
  const actions = new Set()
  if (/위험|폭력|맞았|죽고|자해|살려|납치|협박|쫓아|무서/.test(message)) {
    actions.add('call-112')
    actions.add('send-sos')
  }
  if (/잘 곳|잠.{0,3}곳|쉼터|가출|집에.{0,4}못|머물/.test(message)) {
    actions.add('find-shelter')
    actions.add('call-1388')
  }
  if (/돈|생활비|식사|밥|지원금|일자리|주거비/.test(message)) actions.add('view-support')
  if (/상담|이야기|외로|힘들|불안|우울/.test(message)) actions.add('call-1388')
  return [...actions]
}

export function fallbackChatReply(message) {
  const actions = detectChatActions(message)
  if (actions.includes('call-112')) {
    return {
      reply: '지금 다치거나 위협받을 가능성이 있다면 먼저 112에 전화하거나 가까운 믿을 수 있는 어른에게 도움을 요청해 주세요. 위치를 공유할 수 있다면 Haven의 긴급 알림도 함께 접수할 수 있어요.',
      actions
    }
  }
  if (actions.includes('find-shelter')) {
    return {
      reply: '오늘 머물 곳이 필요하군요. 가까운 청소년쉼터를 확인해 볼게요. 실제 입소 가능 여부는 출발 전에 쉼터 또는 청소년전화 1388로 꼭 확인해 주세요.',
      actions
    }
  }
  if (actions.includes('view-support')) {
    return {
      reply: '지금 신청할 수 있는 식사, 생활비, 주거 지원을 함께 찾아볼게요. 지원 사업 화면에서 조건과 신청 방법을 확인할 수 있어요.',
      actions
    }
  }
  return {
    reply: '말해줘서 고마워요. 지금 가장 힘든 일부터 천천히 적어도 괜찮아요. 급하게 도움이 필요하면 청소년전화 1388을 이용할 수 있어요.',
    actions
  }
}

export function createChatService(options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY
  const model = options.model || process.env.OPENAI_MODEL || DEFAULT_MODEL
  const client = options.client || (apiKey ? new OpenAI({ apiKey }) : null)
  const logger = options.logger || console

  return {
    configured: Boolean(client),
    provider: 'openai',
    model,
    async reply({ message, history = [] }) {
      const actions = detectChatActions(message)
      if (!client) return { ...fallbackChatReply(message), source: 'safety-fallback' }

      const input = history.slice(-6).map((item) => ({
        role: item.role === 'helper' ? 'assistant' : 'user',
        content: item.content
      }))
      input.push({ role: 'user', content: message })

      try {
        const response = await client.responses.create({
          model,
          instructions: SAFETY_INSTRUCTIONS,
          input,
          max_output_tokens: 320,
          store: false
        })
        const reply = response.output_text?.trim()
        if (!reply) throw new Error('empty-chat-response')
        return { reply, actions, source: 'openai' }
      } catch (error) {
        const reason = error?.status || error?.code || error?.name || 'unknown'
        logger.warn?.(`[chat] OpenAI response unavailable (${reason}); using safety fallback`)
        return { ...fallbackChatReply(message), source: 'safety-fallback' }
      }
    }
  }
}
