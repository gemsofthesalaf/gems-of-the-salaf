import { normalizeArabic, normalizeEnglish } from './text-normalizer'

// Simple Levenshtein distance implementation for fuzzy string matching
function getLevenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0))

  for (let i = 0; i <= a.length; i++) matrix[i][0] = i
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }

  return matrix[a.length][b.length]
}

function getSimilarityScore(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1.0
  if (a.length === 0 || b.length === 0) return 0.0
  
  const distance = getLevenshteinDistance(a, b)
  const maxLen = Math.max(a.length, b.length)
  
  return 1 - (distance / maxLen)
}

export interface DuplicateCheckResult {
  isDuplicate: boolean
  confidence: number
  matchedQuoteId?: string
}

export function checkDuplicate(
  newArabic: string | null,
  newEnglish: string | null,
  existingQuotes: Array<{ id: string, arabic_text: string | null, english_text: string | null }>
): DuplicateCheckResult {
  const normNewArabic = newArabic ? normalizeArabic(newArabic) : ''
  const normNewEnglish = newEnglish ? normalizeEnglish(newEnglish) : ''

  let bestMatchId: string | undefined
  let highestConfidence = 0

  for (const existing of existingQuotes) {
    const normExistingArabic = existing.arabic_text ? normalizeArabic(existing.arabic_text) : ''
    const normExistingEnglish = existing.english_text ? normalizeEnglish(existing.english_text) : ''

    let confidence = 0
    
    // Check Arabic similarity if both exist
    if (normNewArabic && normExistingArabic) {
      const arSim = getSimilarityScore(normNewArabic, normExistingArabic)
      if (arSim > confidence) confidence = arSim
    }

    // Check English similarity
    if (normNewEnglish && normExistingEnglish) {
      const enSim = getSimilarityScore(normNewEnglish, normExistingEnglish)
      if (enSim > confidence) confidence = enSim
    }

    // Combine them or take highest. We take highest for simpler thresholding.
    if (confidence > highestConfidence) {
      highestConfidence = confidence
      bestMatchId = existing.id
    }
  }

  // Threshold for considering it a duplicate (e.g. 85% similarity)
  if (highestConfidence > 0.85) {
    return {
      isDuplicate: true,
      confidence: highestConfidence,
      matchedQuoteId: bestMatchId
    }
  }

  return {
    isDuplicate: false,
    confidence: highestConfidence
  }
}
