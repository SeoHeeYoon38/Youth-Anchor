import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createChatService, detectChatActions } from './ai-chat.js'

test('chat actions map urgent and shelter requests to safe next steps', () => {
  const actions = detectChatActions('지금 위험하고 오늘 잘 곳이 없어요')
  assert.ok(actions.includes('call-112'))
  assert.ok(actions.includes('send-sos'))
  assert.ok(actions.includes('find-shelter'))
  assert.ok(actions.includes('call-1388'))
})

test('OpenAI chat uses the Responses API without storing the response', async () => {
  let request
  const service = createChatService({
    model: 'test-model',
    client: {
      responses: {
        create: async (input) => {
          request = input
          return { output_text: '지금 필요한 도움부터 함께 살펴볼게요.' }
        }
      }
    },
    logger: { warn() {} }
  })

  const result = await service.reply({
    message: '돈과 식사가 필요해요',
    history: [{ role: 'helper', content: '무엇을 도와드릴까요?' }]
  })

  assert.equal(result.source, 'openai')
  assert.equal(request.model, 'test-model')
  assert.equal(request.store, false)
  assert.equal(request.input.at(-1).content, '돈과 식사가 필요해요')
  assert.ok(result.actions.includes('view-support'))
})

test('chat falls back to safety guidance when OpenAI is unavailable', async () => {
  const service = createChatService({
    client: { responses: { create: async () => { throw Object.assign(new Error('quota'), { status: 429 }) } } },
    logger: { warn() {} }
  })

  const result = await service.reply({ message: '오늘 잘 곳이 없어요' })
  assert.equal(result.source, 'safety-fallback')
  assert.ok(result.actions.includes('find-shelter'))
  assert.match(result.reply, /1388/)
})
