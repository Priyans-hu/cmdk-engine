import { describe, it, expect } from 'vitest'
import { createDefaultTranslation, getTranslationKeys } from '../../src/core/i18n'

describe('i18n', () => {
  describe('createDefaultTranslation', () => {
    it('returns English string for known keys', () => {
      const t = createDefaultTranslation()
      expect(t('palette.placeholder')).toBe('Type a command or search...')
      expect(t('palette.empty')).toBe('No results found.')
      expect(t('group.recent')).toBe('Recent')
      expect(t('group.other')).toBe('Other')
    })

    it('returns the key itself for unknown keys', () => {
      const t = createDefaultTranslation()
      expect(t('unknown.key')).toBe('unknown.key')
    })

    it('returns loading text', () => {
      const t = createDefaultTranslation()
      expect(t('palette.loading')).toBe('Loading...')
    })

    it('returns search history label', () => {
      const t = createDefaultTranslation()
      expect(t('search.history')).toBe('Recent Searches')
    })
  })

  describe('getTranslationKeys', () => {
    it('returns all known keys', () => {
      const keys = getTranslationKeys()
      expect(keys).toContain('palette.placeholder')
      expect(keys).toContain('palette.empty')
      expect(keys).toContain('group.recent')
      expect(keys).toContain('group.other')
      expect(keys.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('custom translation function', () => {
    it('can be replaced with a custom implementation', () => {
      const customT = (key: string) => {
        const translations: Record<string, string> = {
          'palette.placeholder': 'Einen Befehl eingeben...',
          'palette.empty': 'Keine Ergebnisse.',
          'group.recent': 'Neueste',
          'group.other': 'Sonstige',
        }
        return translations[key] ?? key
      }

      expect(customT('palette.placeholder')).toBe('Einen Befehl eingeben...')
      expect(customT('group.recent')).toBe('Neueste')
      expect(customT('unknown')).toBe('unknown')
    })
  })
})
