import { describe, expect, it } from '@jest/globals'
import { readFileSync } from 'node:fs'
import {
  isGeneratedPlayerName,
  isPlayerCode,
  normalizePlayerCode,
  PLAYER_CODE_ALPHABET,
  PLAYER_CODE_LENGTH,
  PLAYER_NAME_PREFIXES,
  PLAYER_NAME_TITLES,
} from '../src/playerIdentity.js'
import { generatePlayerCode, generatePlayerName, hashPlayerCode } from '../src/playerCredentials.js'

describe('adventurer identity rules', () => {
  it('uses the editable TXT word banks in the compiled shared module', () => {
    const text = readFileSync(new URL('../src/player-name-words.txt', import.meta.url), 'utf8')
    const words: Record<'prefixes' | 'titles', string[]> = { prefixes: [], titles: [] }
    let section: keyof typeof words = 'prefixes'
    for (const line of text.split(/\r?\n/).map(line => line.trim())) {
      if (!line || line.startsWith('#')) continue
      if (line === '[prefixes]' || line === '[titles]')
        section = line === '[prefixes]' ? 'prefixes' : 'titles'
      else words[section].push(line)
    }
    expect(PLAYER_NAME_PREFIXES).toEqual(words.prefixes)
    expect(PLAYER_NAME_TITLES).toEqual(words.titles)
  })

  it('normalizes secret codes typed from photos', () => {
    expect(normalizePlayerCode(' ab-cd1 ')).toBe('ABCD1')
    expect(normalizePlayerCode('o0 il-l')).toBe('00111')
    expect(normalizePlayerCode('a b-c d e')).toBe('ABCDE')
  })

  it('accepts exactly five Crockford base32 characters after normalization', () => {
    for (const valid of ['01234', 'abcde', 'a-b c-d-e', 'O0IL1', 'vwxyz']) {
      expect(isPlayerCode(valid)).toBe(true)
    }
    for (const invalid of [undefined, null, 1234, '', 'ABCD', 'ABCDEF', 'ABCU1', 'AB@12']) {
      expect(isPlayerCode(invalid)).toBe(false)
    }
  })

  it('generates five-character secret codes using the approved alphabet', () => {
    const alphabet = new Set(PLAYER_CODE_ALPHABET)
    for (let i = 0; i < 100; i++) {
      const code = generatePlayerCode()
      expect(code).toHaveLength(PLAYER_CODE_LENGTH)
      expect([...code].every(char => alphabet.has(char))).toBe(true)
      expect(code).not.toMatch(/[ILOU]/)
    }
  })

  it('generates base aliases and accepts canonical collision counters only', () => {
    const bases = new Set(
      PLAYER_NAME_PREFIXES.flatMap(prefix => PLAYER_NAME_TITLES.map(title => `${prefix} ${title}`))
    )
    for (let i = 0; i < 100; i++) {
      const name = generatePlayerName()
      expect(isGeneratedPlayerName(name)).toBe(true)
      expect(bases.has(name)).toBe(true)
    }
    expect(isGeneratedPlayerName('Amber Query Crafter')).toBe(true)
    expect(isGeneratedPlayerName('Amber Query Crafter 2')).toBe(true)
    expect(isGeneratedPlayerName('Amber Query Crafter 10')).toBe(true)
    for (const suffix of ['1', '0', '02', '-2', '2.5', '2e3', '2147483648']) {
      expect(isGeneratedPlayerName(`Amber Query Crafter ${suffix}`)).toBe(false)
    }
    expect(isGeneratedPlayerName('Person Name')).toBe(false)
    expect(isGeneratedPlayerName('person@example.invalid')).toBe(false)
  })

  it('hashes normalized secret codes deterministically without storing the plain text', async () => {
    const hash = await hashPlayerCode('a-bc d1')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).toBe(await hashPlayerCode('ABCDI'))
    expect(hash).not.toContain('ABCD1')
    expect(await hashPlayerCode('ABCDE')).not.toBe(hash)
    await expect(hashPlayerCode('bad!')).rejects.toThrow('Player secret code is invalid')
  })
})
