import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addChecklistItems, mergeChecklists } from './checklistStore.js'

test('법률 상담 체크리스트는 캘린더 체크리스트 형식으로 추가된다', () => {
  const existing = [{ id: '1', text: '물 마시기', done: false }]
  const result = addChecklistItems(existing, ['증거 화면 저장하기', '물 마시기'], 'legal:labor', 100)

  assert.equal(result.length, 2)
  assert.deepEqual(result[1], { id: '100-0', text: '증거 화면 저장하기', done: false, source: 'legal:labor' })
})

test('로컬과 백엔드 체크리스트를 합쳐도 같은 항목 id는 중복되지 않는다', () => {
  const result = mergeChecklists(
    [{ id: '1', text: '첫 항목', done: false }],
    [{ id: '1', text: '첫 항목', done: true }, { id: '2', text: '둘째 항목', done: false }]
  )

  assert.equal(result.length, 2)
  assert.equal(result[0].done, true)
})
