import { describe, it, expect } from 'vitest'
import { parseTelegramPost } from '@/lib/telegram-parser'
import { normalizeArabic } from '@/lib/text-normalizer'

describe('Telegram Parser', () => {
  it('should extract Arabic, English, Scholar, and Source', () => {
    const rawPost = `
Ibn al-Qayyim said:
The ruin of the heart comes from feeling secure and negligence.
خراب القلب من الأمن والغفلة
[Al-Fawa'id, p. 45]
    `
    const parsed = parseTelegramPost(rawPost)
    
    expect(parsed.scholar).toBe('Ibn al-Qayyim')
    expect(parsed.english_text).toBe('The ruin of the heart comes from feeling secure and negligence.')
    expect(parsed.arabic_text).toBe('خراب القلب من الأمن والغفلة')
    expect(parsed.source).toBe("Al-Fawa'id, p. 45")
  })
})

describe('Text Normalizer', () => {
  it('should remove Arabic diacritics', () => {
    const textWithTashkeel = 'خَرَابُ الْقَلْبِ مِنَ الْأَمْنِ'
    const normalized = normalizeArabic(textWithTashkeel)
    expect(normalized).toBe('خراب القلب من الامن')
  })
})
