// Veg / Egg / Non-veg classification.
//
// Order of trust:
//   1. Explicit Diet tags (Indian dataset uses "Vegetarian", "Non Vegeterian" (sic),
//      "Eggetarian", "Vegan", "High Protein Vegetarian"). These are authoritative —
//      they came from the recipe's source metadata.
//   2. Ingredient + title keyword fallback for recipes without diet tags
//      (TheMealDB / Kaggle imports).
//
// Returns one of: 'veg' | 'egg' | 'nonveg'.

const MEAT_TOKENS = [
  'chicken', 'beef', 'pork', 'fish', 'salmon', 'shrimp', 'meat', 'lamb',
  'bacon', 'turkey', 'sausage', 'ham', 'prawn', 'tuna', 'crab', 'lobster',
  'mince', 'meatball', 'anchovy', 'sardine', 'duck', 'venison', 'quail',
  'mutton', 'goat', 'oyster', 'clam', 'mussel', 'squid', 'octopus',
]

const EGG_TOKENS = ['egg', 'eggs']

export function classifyDiet(recipe) {
  const tagsArr = Array.isArray(recipe?.tags) ? recipe.tags : []
  const tagsLower = tagsArr.map((t) => String(t || '').toLowerCase().trim())

  // 1a. Explicit non-veg tag (covers "non vegetarian", "non vegeterian", "non-veg")
  if (tagsLower.some((t) => t.includes('non vegetarian') || t.includes('non vegeterian') || t === 'nonveg' || t === 'non-veg' || t === 'non veg')) {
    return 'nonveg'
  }
  // 1b. Eggetarian
  if (tagsLower.some((t) => t.includes('eggetarian'))) {
    return 'egg'
  }
  // 1c. Vegan or Vegetarian (note: this must come after the "non vegetarian" check above
  // because "non vegetarian" contains the substring "vegetarian")
  if (tagsLower.some((t) => t === 'vegan' || t.includes('vegetarian'))) {
    return 'veg'
  }

  // 2. Fallback: scan ingredients + title for meat / egg keywords.
  const ingsArr = Array.isArray(recipe?.ingredients) ? recipe.ingredients : []
  const ingsText = ingsArr
    .map((i) => (typeof i === 'string' ? i : (i?.name || '')))
    .join(' ')
    .toLowerCase()
  const text = `${ingsText} ${(recipe?.title || '').toLowerCase()}`

  if (MEAT_TOKENS.some((m) => text.includes(m))) return 'nonveg'
  if (EGG_TOKENS.some((e) => new RegExp(`\\b${e}\\b`).test(text))) return 'egg'
  return 'veg'
}

// Convenience: returns true for veg-only filters (excludes eggetarian).
export const isStrictVeg = (recipe) => classifyDiet(recipe) === 'veg'
