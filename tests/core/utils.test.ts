import { describe, it, expect } from 'vitest'
import { pathSegmentToLabel, pathToLabel, pathToGroup, pathToId } from '../../src/core/utils'

describe('pathSegmentToLabel', () => {
  it('handles kebab, snake, camel, and Pascal case', () => {
    expect(pathSegmentToLabel('user-settings')).toBe('User Settings')
    expect(pathSegmentToLabel('phone_numbers')).toBe('Phone Numbers')
    expect(pathSegmentToLabel('phoneNumbers')).toBe('Phone Numbers')
    expect(pathSegmentToLabel('BillingOverview')).toBe('Billing Overview')
  })

  it('splits acronym boundaries', () => {
    expect(pathSegmentToLabel('APIKeys')).toBe('API Keys')
    expect(pathSegmentToLabel('OAuthSettings')).toBe('O Auth Settings')
    expect(pathSegmentToLabel('userID')).toBe('User ID')
  })
})

describe('pathToLabel', () => {
  it('uses the last meaningful segment', () => {
    expect(pathToLabel('/billing/overview')).toBe('Overview')
    expect(pathToLabel('/settings')).toBe('Settings')
    expect(pathToLabel('/billing/api-keys')).toBe('Api Keys')
  })

  it('returns Home for root/empty', () => {
    expect(pathToLabel('/')).toBe('Home')
    expect(pathToLabel('')).toBe('Home')
  })

  it('falls back to Home when every segment is dynamic', () => {
    expect(pathToLabel('/:id')).toBe('Home')
    expect(pathToLabel('/[slug]')).toBe('Home')
  })
})

describe('pathToGroup', () => {
  it('uses the first segment for multi-segment paths', () => {
    expect(pathToGroup('/billing/overview')).toBe('Billing')
    expect(pathToGroup('/settings/team')).toBe('Settings')
  })

  it('returns undefined for single-segment or root paths', () => {
    expect(pathToGroup('/settings')).toBeUndefined()
    expect(pathToGroup('/')).toBeUndefined()
  })

  it('ignores leading dynamic segments', () => {
    expect(pathToGroup('/:tenantId/billing/overview')).toBe('Billing')
    expect(pathToGroup('/[org]/settings')).toBeUndefined() // only one real segment
  })
})

describe('pathToId', () => {
  it('generates a stable id', () => {
    expect(pathToId('/billing/overview')).toBe('billing--overview')
    expect(pathToId('/')).toBe('home')
  })
})
