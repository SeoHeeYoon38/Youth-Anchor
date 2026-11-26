import { useEffect, useEffectEvent, useRef } from 'react'

// Keep native scrolling if the gesture starts inside scrolled content.
function canPull(target, surface) {
  if (target.closest('button, a, input, textarea, select, label, [contenteditable="true"]')) return false
  for (let node = target; node; node = node.parentElement) {
    if (node.scrollTop > 1) return false
    if (node === surface) break
  }
  return true
}

export default function usePullDown(onDismiss) {
  const ref = useRef(null)
  const dismiss = useEffectEvent(onDismiss)

  useEffect(() => {
    const surface = ref.current
    let start = null
    let distance = 0

    function reset() {
      start = null
      distance = 0
      delete surface.dataset.pulling
      surface.style.removeProperty('translate')
    }

    function begin(event, point) {
      reset()
      if (canPull(event.target, surface)) start = { x: point.clientX, y: point.clientY }
    }

    function move(event, point) {
      if (!start) return
      const dx = Math.abs(point.clientX - start.x)
      const dy = point.clientY - start.y
      if (!distance) {
        if (dx < 6 && Math.abs(dy) < 6) return
        if (dy <= dx || !event.cancelable) return reset()
      }
      event.preventDefault()
      distance = Math.max(0, dy)
      surface.dataset.pulling = ''
      surface.style.translate = `0 ${distance}px`
    }

    function finish() {
      const shouldClose = distance >= 64
      reset()
      if (shouldClose) dismiss()
    }

    function touchStart(event) {
      if (event.touches.length === 1) begin(event, event.touches[0])
      else reset()
    }
    function touchMove(event) {
      if (event.touches.length === 1) move(event, event.touches[0])
      else reset()
    }
    function pointerDown(event) {
      // Non-passive touchmove lets a finger scroll up or pull down from the same spot.
      if (event.pointerType === 'touch' || event.button !== 0) return
      begin(event, event)
      if (start) {
        surface.setPointerCapture(event.pointerId)
        event.preventDefault()
      }
    }
    function pointerMove(event) {
      if (surface.hasPointerCapture(event.pointerId) && event.pointerType !== 'touch') move(event, event)
    }
    function pointerUp(event) {
      if (event.pointerType !== 'touch') finish()
    }
    const listeners = new AbortController()
    const options = { signal: listeners.signal }
    surface.addEventListener('touchstart', touchStart, { ...options, passive: true })
    surface.addEventListener('touchmove', touchMove, { ...options, passive: false })
    surface.addEventListener('touchend', finish, options)
    surface.addEventListener('touchcancel', reset, options)
    surface.addEventListener('pointerdown', pointerDown, options)
    surface.addEventListener('pointermove', pointerMove, options)
    surface.addEventListener('pointerup', pointerUp, options)
    surface.addEventListener('lostpointercapture', event => {
      if (event.pointerType !== 'touch') reset()
    }, options)
    return () => listeners.abort()
  }, [])
  return ref
}
