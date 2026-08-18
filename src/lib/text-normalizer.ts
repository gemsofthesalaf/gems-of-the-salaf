// Removes Arabic diacritics (tashkeel), tatweel, and normalizes characters
export function normalizeArabic(text: string): string {
  if (!text) return ''
  
  let normalized = text
  
  // Remove diacritics (Tashkeel)
  normalized = normalized.replace(/[\u0617-\u061A\u064B-\u0652\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '')
  
  // Remove Tatweel
  normalized = normalized.replace(/\u0640/g, '')
  
  // Normalize Alef
  normalized = normalized.replace(/[أإآ]/g, 'ا')
  
  // Normalize Yaa and Alif Maqsura
  normalized = normalized.replace(/[ىي]/g, 'ي')
  
  // Normalize Taa Marbuta and Haa
  normalized = normalized.replace(/[ةه]/g, 'ه')
  
  // Trim spaces and normalize whitespace
  return normalized.replace(/\s+/g, ' ').trim()
}

export function normalizeEnglish(text: string): string {
  if (!text) return ''
  
  return text
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // Remove punctuation
    .replace(/\s+/g, ' ')
    .trim()
}
