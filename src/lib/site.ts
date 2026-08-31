export const SITE_NAME = 'Gems of the Salaf'
export const SITE_NAME_ARABIC = 'جواهر السلف'
export const SITE_DESCRIPTION =
  'A searchable scholarly archive of beneficial sayings with Arabic originals, English translations, and transparent source information.'
export const PRODUCTION_URL = 'https://gemsofthesalaf.com'
export const TELEGRAM_URL = 'https://t.me/gemsofthesalaf'

export function getSiteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL

  if (configured) {
    try {
      const parsed = new URL(configured)
      if (parsed.protocol === 'https:' || parsed.hostname === 'localhost') {
        return parsed.origin
      }
    } catch {
      // Fall through to the trusted production origin.
    }
  }

  return PRODUCTION_URL
}

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${getSiteUrl()}/`).toString()
}

export function truncateDescription(value: string, length = 155): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= length) return normalized
  return `${normalized.slice(0, Math.max(0, length - 1)).trimEnd()}…`
}

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}
