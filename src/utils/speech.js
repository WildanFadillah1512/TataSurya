// src/utils/speech.js
// Simple wrapper to safely use Web Speech API across browsers and handle voice loading.

const isBrowser = typeof window !== 'undefined'
const available = isBrowser && 'speechSynthesis' in window
let voicesInitialized = false

function initVoices(timeout = 2000) {
  if (!available) return Promise.resolve([])
  if (voicesInitialized) return Promise.resolve(window.speechSynthesis.getVoices())
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices()
    if (voices && voices.length) {
      voicesInitialized = true
      return resolve(voices)
    }
    const handler = () => {
      const v2 = window.speechSynthesis.getVoices()
      if (v2 && v2.length) {
        voicesInitialized = true
        window.speechSynthesis.removeEventListener('voiceschanged', handler)
        return resolve(v2)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', handler)
    // safety fallback
    setTimeout(() => {
      try {
        const v3 = window.speechSynthesis.getVoices() || []
        voicesInitialized = true
        try { window.speechSynthesis.removeEventListener('voiceschanged', handler) } catch(e) {}
        resolve(v3)
      } catch (e) { resolve([]) }
    }, timeout)
  })
}

function isAvailable() {
  return available
}

function getVoices() {
  if (!available) return []
  try { return window.speechSynthesis.getVoices() || [] } catch (e) { return [] }
}

function getVoicesCount() {
  return getVoices().length
}

async function speak(text, opts = {}) {
  if (!available) return Promise.reject(new Error('Speech not available'))
  const { lang = 'id-ID', rate = 1, pitch = 1, volume = 1, voiceName = null } = opts

  await initVoices()

  return new Promise((resolve, reject) => {
    try {
      window.speechSynthesis.cancel()
      const utt = new SpeechSynthesisUtterance(text)
      utt.lang = lang
      utt.rate = rate
      utt.pitch = pitch
      utt.volume = volume

      // Pick a sensible voice if none specified
      if (!voiceName) {
        const vs = window.speechSynthesis.getVoices() || []
        const match = vs.find(v => (v.lang || '').toLowerCase().startsWith(lang.slice(0,2).toLowerCase()))
        if (match) utt.voice = match
      } else {
        const v = window.speechSynthesis.getVoices().find(k => k.name === voiceName)
        if (v) utt.voice = v
      }

      utt.onend = () => resolve()
      utt.onerror = (e) => reject(e)
      window.speechSynthesis.speak(utt)
    } catch (e) { reject(e) }
  })
}

function cancel() {
  if (!available) return
  try { window.speechSynthesis.cancel() } catch (e) { console.warn('speech cancel failed', e) }
}

export default { isAvailable, initVoices, speak, cancel, getVoices, getVoicesCount }
