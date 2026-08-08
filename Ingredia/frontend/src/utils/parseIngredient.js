// Best-effort splitter for free-text ingredient strings.
//
// Handles three input shapes:
//   1. Object: { name: "rice", amount: "1 cup" } | { name, quantity } | { name, measure }
//   2. String with a leading quantity + unit: "1-1/2 cups Rice Vermicelli (Thin)"
//      → { amount: "1-1/2 cups", name: "Rice Vermicelli" }
//   3. Plain string: "Salt - to taste"
//      → { amount: "", name: "Salt" }   (parenthetical and " - …" tails are stripped)

const QTY_RE = /^(\d+[\d./-]*(?:\s+\d+\/\d+)?\s*(?:cups?|tablespoons?|tbsps?|teaspoons?|tsps?|tbsp|tsp|ounces?|oz|grams?|gms?|gm|kgs?|ml|liters?|litres?|pieces?|pcs?|sprigs?|sticks?|cloves?|leaves?|pints?|large|small|medium|whole|inch)?\b)\s*/i

const cleanName = (s) => String(s || '')
  .replace(/\([^)]*\)/g, '')
  .split(/\s*[-,]\s*/)[0]
  .trim()

export function parseIngredient(raw) {
  if (raw && typeof raw === 'object') {
    return {
      name: cleanName(raw.name || raw.normalized || ''),
      amount: String(raw.amount || raw.quantity || raw.measure || '').trim(),
    }
  }
  const s = String(raw || '').trim()
  if (!s) return { name: '', amount: '' }
  const m = s.match(QTY_RE)
  if (m && m[0].trim()) {
    return { amount: m[0].trim(), name: cleanName(s.slice(m[0].length)) }
  }
  return { name: cleanName(s), amount: '' }
}
