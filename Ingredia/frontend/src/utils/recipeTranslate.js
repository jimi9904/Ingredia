// Runtime translation for dynamic recipe text (titles, ingredients, instructions, etc.)
// because we can't pre-translate 9,400+ MongoDB records into a JSON file.
//
// Strategy:
//   1. Try several free public translation endpoints in order — each one wraps a
//      different upstream so we get failover when one is rate-limited or down.
//   2. Cache every successful translation in localStorage keyed by the source text.
//      A given recipe gets translated at most once across all sessions on the device.
//   3. Dedupe in-flight requests so re-renders of the same component don't fan out.
//   4. Strings that already contain Devanagari (the dataset has a few) pass through.

const CACHE_KEY = 'ingredia_recipe_translations_v1'
const HAS_DEVANAGARI = /[ऀ-ॿ]/

let _cache = null
function loadCache() {
  if (_cache) return _cache
  try { _cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { _cache = {} }
  return _cache
}

let _saveTimer = null
function scheduleSave() {
  clearTimeout(_saveTimer)
  // 2 second debounce — JSON.stringify on a growing cache can take meaningful time
  // on the main thread, so coalesce rapid bursts of successful translations into
  // one write per quiet period.
  _saveTimer = setTimeout(() => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_cache)) } catch { /* ignore quota */ }
  }, 2000)
}

// Multi-endpoint translator. Each entry takes a string and returns a translated
// string (or throws). Listed in priority order; we stop at the first success.
const TRANSLATORS = [
  // MyMemory — works without a key, reliable for short strings.
  // Cache means we usually only hit it once per unique phrase per device.
  async (text) => {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|hi`)
    if (!res.ok) throw new Error(`mymemory ${res.status}`)
    const data = await res.json()
    const t = data?.responseData?.translatedText
    if (!t || /MYMEMORY WARNING/i.test(t)) throw new Error('mymemory: no/limited')
    return t
  },
  // Lingva — public Google Translate proxy. CORS-friendly, no API key.
  // Falls back when MyMemory is rate-limited or down.
  async (text) => {
    const res = await fetch(`https://lingva.ml/api/v1/en/hi/${encodeURIComponent(text)}`)
    if (!res.ok) throw new Error(`lingva ${res.status}`)
    const data = await res.json()
    if (!data?.translation) throw new Error('lingva: no translation')
    return data.translation
  },
]

// Limit how many simultaneous translation requests we fire. Set conservatively because:
//   1. MyMemory's daily quota is shared across the whole browser session.
//   2. Each call also touches our render pipeline via setState — flooding it freezes the tab.
//   3. Most pages have at most 20-30 distinct strings; even with 2-way parallelism the user
//      sees results within ~3-5 seconds, which is fast enough perceptually.
const MAX_PARALLEL = 2
let _running = 0
const _queue = []

function acquireSlot() {
  return new Promise((resolve) => {
    if (_running < MAX_PARALLEL) { _running++; resolve() }
    else _queue.push(resolve)
  })
}
function releaseSlot() {
  _running--
  const next = _queue.shift()
  if (next) { _running++; next() }
}

const _inFlight = new Map() // text -> Promise<string>

/**
 * Translate an English string to Hindi. Returns the original string if all
 * endpoints fail. Safe to call on the same string many times in parallel —
 * later callers will get the cached or in-flight result.
 */
export async function translateToHindi(text) {
  if (text == null) return text
  const str = String(text)
  if (!str.trim()) return str
  if (HAS_DEVANAGARI.test(str)) return str

  const key = str.trim()
  const cache = loadCache()
  if (cache[key]) return cache[key]

  if (_inFlight.has(key)) return _inFlight.get(key)

  const promise = (async () => {
    await acquireSlot()
    try {
      for (const t of TRANSLATORS) {
        try {
          const out = await t(key)
          if (out && out.trim() && out !== key) {
            cache[key] = out
            scheduleSave()
            return out
          }
        } catch { /* try next endpoint */ }
      }
      return str
    } finally {
      releaseSlot()
      _inFlight.delete(key)
    }
  })()

  _inFlight.set(key, promise)
  return promise
}

/** Translate an array of strings in parallel (subject to MAX_PARALLEL). */
export async function translateListToHindi(arr) {
  if (!Array.isArray(arr)) return arr
  return Promise.all(arr.map((x) => (typeof x === 'string' ? translateToHindi(x) : x)))
}
