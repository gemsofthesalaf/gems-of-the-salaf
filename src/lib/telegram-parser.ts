export interface ParsedTelegramPost {
  arabic_text: string | null
  english_text: string | null
  scholar: string | null
  source: string | null
}

export function parseTelegramPost(rawText: string): ParsedTelegramPost {
  if (!rawText) {
    return { arabic_text: null, english_text: null, scholar: null, source: null }
  }

  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  
  const arabicText = []
  const englishText = []
  let scholar = null
  let source = null

  // Arabic regex check
  const isArabic = (text: string) => /[\u0600-\u06FF]/.test(text)

  for (const line of lines) {
    // Check if line looks like attribution [Scholar Name, Book Name, page]
    if ((line.startsWith('[') && line.endsWith(']')) || line.toLowerCase().includes('book:') || line.toLowerCase().includes('reference:')) {
      const cleaned = line.replace(/^\[|\]$/g, '')
      
      if (!scholar) {
        const parts = cleaned.split(/,|—| - /)
        if (parts.length > 0) scholar = parts[0].trim()
        if (parts.length > 1) source = parts.slice(1).join(', ').trim()
      } else {
        source = cleaned.trim()
      }
      continue
    }

    // Try to guess scholar if it starts with "Shaykh", "Ibn", "Imam"
    if (!scholar && (line.toLowerCase().startsWith('shaykh') || line.toLowerCase().startsWith('imam') || line.toLowerCase().startsWith('ibn '))) {
       // Assume it's a scholar attribution line
       const parts = line.split(/said:|says:/i)
       if (parts.length > 1) {
         scholar = parts[0].trim()
         if (parts[1].trim()) englishText.push(parts[1].trim())
       } else {
         scholar = line.trim()
       }
       continue
    }

    if (isArabic(line)) {
      arabicText.push(line)
    } else {
      englishText.push(line)
    }
  }

  return {
    arabic_text: arabicText.length > 0 ? arabicText.join('\n') : null,
    english_text: englishText.length > 0 ? englishText.join('\n') : null,
    scholar: scholar,
    source: source
  }
}
