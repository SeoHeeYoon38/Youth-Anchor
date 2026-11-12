export const CHECKLIST_STORAGE_KEY = 'haven-diary-tasks'

export function readChecklist(storage = globalThis.localStorage) {
  try {
    const saved = JSON.parse(storage?.getItem(CHECKLIST_STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved : []
  } catch {
    return []
  }
}

export function writeChecklist(tasks, storage = globalThis.localStorage) {
  const normalized = Array.isArray(tasks) ? tasks : []
  storage?.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(normalized))
  return normalized
}

export function addChecklistItems(current, texts, source = 'checklist', now = Date.now()) {
  const tasks = Array.isArray(current) ? current : []
  const additions = texts
    .map((text) => String(text || '').trim())
    .filter((text) => text && !tasks.some((task) => task.text === text))
    .map((text, index) => ({ id: `${now}-${index}`, text, done: false, source }))
  return [...tasks, ...additions]
}

export function mergeChecklists(local, remote) {
  const merged = new Map()
  for (const task of [...(Array.isArray(local) ? local : []), ...(Array.isArray(remote) ? remote : [])]) {
    if (!task?.id || !task?.text) continue
    merged.set(String(task.id), { ...task, id: String(task.id), text: String(task.text), done: Boolean(task.done) })
  }
  return [...merged.values()]
}
