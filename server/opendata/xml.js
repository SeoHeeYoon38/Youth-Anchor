const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' '
}

function decodeEntities(value) {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      const code = Number.parseInt(entity.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    if (entity.startsWith('#')) {
      const code = Number.parseInt(entity.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : match
    }
    return ENTITIES[entity] ?? match
  })
}

function assign(parent, name, value) {
  if (parent[name] === undefined) {
    parent[name] = value
    return
  }
  if (Array.isArray(parent[name])) {
    parent[name].push(value)
    return
  }
  parent[name] = [parent[name], value]
}

/**
 * 공공데이터포털 응답용 최소 XML 파서.
 *
 * 외부 의존성 없이 `<tag>값</tag>` 중심의 단순 응답 문서를 자바스크립트 객체로 바꾼다.
 * 반복되는 형제 노드는 자동으로 배열이 되며, 텍스트만 가진 노드는 문자열로 축약한다.
 * 속성, 네임스페이스, 혼합 콘텐츠는 이 API들에서 쓰이지 않으므로 지원하지 않는다.
 */
export function parseXml(xml) {
  if (typeof xml !== 'string') return {}

  const source = xml
    .replace(/<\?[\s\S]*?\?>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<!DOCTYPE[^>]*>/gi, '')

  const root = {}
  const stack = [root]
  const tokenPattern = /<\/?([A-Za-z_][\w.:-]*)([^>]*?)(\/?)>|<!\[CDATA\[([\s\S]*?)]]>|([^<]+)/g

  let match
  while ((match = tokenPattern.exec(source)) !== null) {
    const [token, tagName, , selfClosing, cdata, text] = match

    if (cdata !== undefined) {
      const current = stack.at(-1)
      current['#text'] = (current['#text'] || '') + cdata
      continue
    }

    if (text !== undefined) {
      const trimmed = text.trim()
      if (trimmed) {
        const current = stack.at(-1)
        current['#text'] = (current['#text'] || '') + decodeEntities(trimmed)
      }
      continue
    }

    if (token.startsWith('</')) {
      const finished = stack.pop()
      if (stack.length === 0) {
        stack.push(root)
        continue
      }
      const parent = stack.at(-1)
      const keys = Object.keys(finished)
      const collapsed = keys.length === 0
        ? ''
        : keys.length === 1 && keys[0] === '#text'
          ? finished['#text']
          : finished
      if (collapsed && typeof collapsed === 'object') delete collapsed['#text']
      assign(parent, tagName, collapsed)
      continue
    }

    if (selfClosing) {
      assign(stack.at(-1), tagName, '')
      continue
    }

    stack.push({})
  }

  return root
}

/** 파서 결과에서 항상 배열을 얻는다. 단일 노드는 1개 원소 배열로 승격한다. */
export function toArray(value) {
  if (value === undefined || value === null || value === '') return []
  return Array.isArray(value) ? value : [value]
}
