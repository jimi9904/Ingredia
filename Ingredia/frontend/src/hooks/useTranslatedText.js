import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { translateToHindi, translateListToHindi } from '../utils/recipeTranslate'

// Two-char delimiter unlikely to appear inside ingredient names or instructions.
// Used to build a content-based stable key for array deps so a freshly-allocated
// array with identical contents doesn't refire the effect (which caused an
// infinite render loop when components mapped/filtered into the hook).
const ARRAY_KEY_SEP = '|'

/**
 * Translates a single English string to Hindi when the current i18n language is `hi`.
 * In any other language it returns the original string unchanged.
 * Falls back to the original if the translation API fails.
 */
export function useTranslatedText(text) {
  const { i18n } = useTranslation()
  const [translated, setTranslated] = useState(text)

  useEffect(() => {
    if (i18n.language !== 'hi' || text == null || text === '') {
      // Only setState if we'd actually change the value — avoid a wasted render.
      setTranslated((prev) => (prev === text ? prev : text))
      return
    }
    let cancelled = false
    translateToHindi(text).then((out) => {
      if (cancelled) return
      setTranslated((prev) => (prev === out ? prev : out))
    }).catch(() => {})
    return () => { cancelled = true }
  }, [text, i18n.language])

  return translated
}

/**
 * Same as useTranslatedText but for an array of strings.
 *
 * IMPORTANT: callers typically pass a newly-allocated array on every render
 * (e.g. `recipe.instructions.map(...)`). To prevent an infinite render loop,
 * the effect depends on a string key derived from the array contents — not the
 * array reference itself.
 */
export function useTranslatedList(items) {
  const { i18n } = useTranslation()
  const [translated, setTranslated] = useState(items)
  const contentKey = Array.isArray(items) ? items.join(ARRAY_KEY_SEP) : ''

  useEffect(() => {
    if (i18n.language !== 'hi' || !Array.isArray(items)) {
      setTranslated(items)
      return
    }
    let cancelled = false
    translateListToHindi(items).then((out) => {
      if (cancelled) return
      // Skip the setState if every item is identical — common when nothing actually
      // translated (API down, or every string was already in cache and unchanged).
      setTranslated((prev) => {
        if (Array.isArray(prev) && prev.length === out.length && prev.every((v, i) => v === out[i])) {
          return prev
        }
        return out
      })
    }).catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, i18n.language])

  return translated
}
