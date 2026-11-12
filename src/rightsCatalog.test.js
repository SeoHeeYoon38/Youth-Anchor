import assert from 'node:assert/strict'
import test from 'node:test'
import { RIGHTS_DOCUMENTS, filterRightsDocuments, getRightsDocument } from '../shared/rightsCatalog.js'

test('document catalog keeps original entries and adds broader support documents', () => {
  const ids = RIGHTS_DOCUMENTS.map((document) => document.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ['resident', 'family', 'basic', 'health', 'income', 'protection', 'bank', 'lease', 'enrollment', 'graduation', 'employment', 'career']) {
    assert.ok(ids.includes(id), `missing original document: ${id}`)
  }
  assert.ok(RIGHTS_DOCUMENTS.length >= 20)
})

test('every document has a reusable book design and official detail metadata', () => {
  for (const document of RIGHTS_DOCUMENTS) {
    assert.ok(document.tone)
    assert.ok(document.icon.endsWith('.svg'))
    assert.ok(document.detail.summary)
    assert.ok(document.detail.checklist.length >= 1)
    if (document.detail.sourceUrl) assert.match(document.detail.sourceUrl, /^https:\/\//)
    if (document.detail.issuance.online) assert.match(document.detail.issuance.online.url, /^https:\/\//)
  }
})

test('catalog filters and direct lookup support backend queries', () => {
  assert.deepEqual(filterRightsDocuments({ query: '한부모' }).map((item) => item.id), ['single-parent'])
  assert.equal(getRightsDocument('military').title, '병적증명서')
  assert.equal(getRightsDocument('missing-document'), null)
})
