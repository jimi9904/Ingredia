export interface MatchScoreResult {
  score: number;
  matched: string[];
  missing: Array<{
    name: string;
    quantity: string | number;
    unit: string;
  }>;
}

export const scoreRecipeAgainstUserIngredients = (
  userIngredients: string[],
  recipeIngredients: any[]
): MatchScoreResult => {
  const normalizedUser = Array.from(
    new Set(
      userIngredients
        .map((ing) => ing.toLowerCase().trim())
        .filter((ing) => ing.length > 0)
    )
  );

  const totalCount = recipeIngredients.length;
  if (totalCount === 0) {
    return { score: 0, matched: [], missing: [] };
  }

  const matched: string[] = [];
  const missing: Array<{ name: string; quantity: string | number; unit: string }> = [];

  for (const ing of recipeIngredients) {
    let displayName = '';
    let normalized = '';
    let quantity: string | number = '';
    let unit = '';

    if (typeof ing === 'object' && ing !== null) {
      displayName = ing.name || ing.normalized || '';
      normalized = (ing.normalized || displayName).toLowerCase().trim();
      quantity = ing.quantity || '';
      unit = ing.unit || '';
    } else {
      displayName = String(ing);
      normalized = displayName.toLowerCase().trim();
    }

    if (!normalized) continue;

    let isMatched = false;
    for (const userIng of normalizedUser) {
      if (
        normalized === userIng ||
        normalized.includes(userIng) ||
        userIng.includes(normalized)
      ) {
        isMatched = true;
        break;
      }
    }

    if (isMatched) {
      matched.push(displayName);
    } else {
      missing.push({
        name: displayName,
        quantity,
        unit,
      });
    }
  }

  const matchScore = Math.round((matched.length / totalCount) * 1000) / 10;

  return {
    score: matchScore,
    matched,
    missing,
  };
};

