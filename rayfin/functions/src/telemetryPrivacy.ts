import { isCountry, normalizeCountry } from './countries.js'

const PRIVATE_FIELDS = new Set([
  'email',
  'playeremail',
  'phone',
  'phonenumber',
  'playerphone',
  'hasphonenumber',
  'state',
  'city',
  'address',
  'postalcode',
  'postcode',
  'latitude',
  'longitude',
  'geolocation',
  'ipaddress',
  'firstname',
  'lastname',
  'realname',
  'playercode',
  'returncode',
  'adventurercode',
  'requestid',
  'registrationid',
  'runes',
  'runeids',
  'runeselection',
  'runehash',
  'runesalt',
  'spell',
  'spellhash',
  'password',
  'passwordhash',
  'secretcode',
  'secretcodehash',
  'secret',
  'clientsecret',
  'token',
  'accesstoken',
  'authorization',
  'useragent',
  'viewport',
  'screen',
  'language',
])

function fieldName(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export function normalizeTelemetryString(key: string, value: string): string {
  return fieldName(key) === 'country' ? normalizeCountry(value) : value
}

// Call only after the bounded JSON snapshot/validation, so accessors cannot run here.
export function containsPrivateTelemetryFields(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return false
  if (Array.isArray(value)) return value.some(containsPrivateTelemetryFields)
  return Object.entries(value).some(([key, child]) => {
    const field = fieldName(key)
    if (field === 'country') return !isCountry(child)
    return PRIVATE_FIELDS.has(field) || containsPrivateTelemetryFields(child)
  })
}
