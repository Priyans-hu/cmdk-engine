import { describe, it, expect } from 'vitest'
import { createFuzzySearch, foldText } from '../../src/core/search'
import { createKeywordEngine } from '../../src/core/keywords'
import type { CommandItem } from '../../src/core/types'

const find = (query: string, items: CommandItem[]) =>
  createFuzzySearch()
    .search(query, items)
    .map((r) => r.item.id)

describe('createFuzzySearch · accents, Unicode forms and spaces', () => {
  it('matches without accents, in the query or in the command', () => {
    expect(find('resume', [{ id: 'resume', label: 'Résumé' }])).toEqual(['resume'])
    expect(find('configuracion', [{ id: 'config', label: 'Configuración' }])).toEqual(['config'])
    expect(find('überblick', [{ id: 'overview', label: 'Uberblick' }])).toEqual(['overview'])
  })

  it('scores an accented match like the same plain-ASCII match', () => {
    const [accented] = createFuzzySearch().search('resume', [{ id: 'a', label: 'Résumé' }])
    const [plain] = createFuzzySearch().search('resume', [{ id: 'p', label: 'Resume' }])
    expect(accented.score).toBe(plain.score)
  })

  it('matches composed and decomposed forms of the same text', () => {
    const composed = 'Caf\u00e9'
    const decomposed = 'Cafe\u0301'
    expect(find(decomposed, [{ id: 'cafe', label: composed }])).toEqual(['cafe'])
    expect(find(composed, [{ id: 'cafe', label: decomposed }])).toEqual(['cafe'])
  })

  it('folds compatibility forms: full-width letters, ligatures and wide spaces', () => {
    expect(find('api docs', [{ id: 'wide', label: '\uff21\uff30\uff29 Docs' }])).toEqual(['wide'])
    expect(find('file', [{ id: 'ligature', label: '\ufb01le manager' }])).toEqual(['ligature'])
    expect(find('usage reports', [{ id: 'nbsp', label: 'Usage\u00a0Reports' }])).toEqual(['nbsp'])
    expect(find('usage reports', [{ id: 'ideo', label: 'Usage\u3000Reports' }])).toEqual(['ideo'])
  })

  it('collapses repeated spaces and tabs', () => {
    const items = [{ id: 'billing', label: 'Billing Overview' }]
    expect(find('billing  over', items)).toEqual(['billing'])
    expect(find('billing\tover', items)).toEqual(['billing'])
    expect(find('  billing   overview  ', items)).toEqual(['billing'])
    expect(find('billing overview', [{ id: 'spaced', label: 'Billing   Overview' }])).toEqual([
      'spaced',
    ])
  })

  it('folds the description, the keywords and the synonym keywords too', () => {
    const items: CommandItem[] = [
      { id: 'desc', label: 'Profile', description: 'Edit your résumé' },
      { id: 'kw', label: 'Team', keywords: ['Équipe'] },
      { id: 'syn', label: 'Docs', meta: { _synonymKeywords: ['guía'] } },
    ]
    expect(find('resume', items)).toEqual(['desc'])
    expect(find('equipe', items)).toEqual(['kw'])
    expect(find('guia', items)).toEqual(['syn'])
  })

  it('keeps marks outside U+0300–U+036F: other scripts stay distinct', () => {
    // NFKD splits ガ into カ + U+3099 (voiced mark), which is kept.
    expect(find('ガイド', [{ id: 'kite', label: 'カイト' }])).toEqual([])
    expect(foldText('\u30ac')).toBe('\u30ab\u3099')
    // Devanagari vowel signs are marks too, and are kept.
    expect(foldText('हिंदी')).toBe('हिंदी'.normalize('NFKD'))
  })

  it('matches Hangul and voiced kana, composed or not', () => {
    const settings = '설정'.normalize('NFC')
    const password = 'パスワード'.normalize('NFC')
    const items = [
      { id: 'settings', label: settings },
      { id: 'password', label: password },
    ]
    expect(find(settings, items)).toEqual(['settings'])
    expect(find(settings.slice(0, 1), items)).toEqual(['settings'])
    expect(find(password, items)).toEqual(['password'])
    expect(find(password.slice(0, 2), items)).toEqual(['password'])
    expect(find(password.normalize('NFD'), items)).toEqual(['password'])
  })

  it('a query that folds to nothing matches nothing', () => {
    const items = [
      { id: 'alpha', label: 'Alpha' },
      { id: 'beta', label: 'Beta' },
    ]
    // A spacing accent (a dead key while typing) and a lone combining mark.
    expect(find('\u00b4', items)).toEqual([])
    expect(find('\u0301', items)).toEqual([])
  })
})

describe('createKeywordEngine · synonyms whatever the accents and spaces', () => {
  it('expands a query that matches a key or value only after folding', () => {
    const { expandQuery } = createKeywordEngine({ cv: ['résumé'] })
    expect(expandQuery('resume')).toEqual(['resume', 'cv'])
    expect(expandQuery('Résumé')).toEqual(['résumé', 'cv'])
    expect(expandQuery('cv')).toEqual(['cv', 'résumé'])
  })

  it('keeps the query, as lowercased and trimmed, as the first term', () => {
    const { expandQuery } = createKeywordEngine({ 'sign out': ['logout'] })
    expect(expandQuery(' Sign  Out ')).toEqual(['sign  out', 'logout'])
  })

  it('enriches a command whose label matches a key only after folding', () => {
    const keywords = createKeywordEngine({ résumé: ['cv'] })
    expect(keywords.enrichItem({ id: 'r', label: 'Resume' }).meta?._synonymKeywords).toEqual(['cv'])
  })

  it('enriches an accented label from a plain key', () => {
    const keywords = createKeywordEngine({ resume: ['cv'] })
    expect(keywords.enrichItem({ id: 'r', label: 'Résumé' }).meta?._synonymKeywords).toEqual(['cv'])
  })
})
