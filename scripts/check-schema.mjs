import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { generateDabConfig } from '../node_modules/@microsoft/rayfin-cli/dist/utils/dab-config-generator.js'

const result = await generateDabConfig({
  projectRoot: process.cwd(),
  dialect: 'mssql',
  buildCommand: 'npm run build:schema',
})
const config = JSON.parse(await readFile(result.configPath, 'utf8'))
const expected = [
  'Player', 'PlayerEntryState', 'QuestionPool', 'QuestionImport', 'Question', 'QuestionPoolMembership',
  'GameSession', 'SessionQuestion', 'GameSessionAnswer',
].sort()
assert.deepEqual(Object.keys(config.entities).sort(), expected,
  'Schema must contain exactly the application entities, including private player-entry state.')
for (const [name, entity] of Object.entries(config.entities)) {
  assert.deepEqual(entity.permissions, [{
    role: 'authenticated',
    actions: [{ action: 'read', policy: { database: '@item.id ne @item.id' } }],
  }], `${name} must not expose records or writes through direct browser data APIs.`)
  assert.deepEqual(entity['x-schema'].constraints.primaryKey.columns, ['id'])
  for (const field of Object.values(entity['x-schema'].fields)) {
    assert.notEqual(field.dbType, 'NVARCHAR(MAX)', `${name} has unbounded text.`)
  }
}
const player = config.entities.Player
assert.equal(player.source, 'Players')
assert.deepEqual(Object.keys(player['x-schema'].fields).sort(), [
  'id', 'name', 'country', 'secretCodeHash', 'createdAt',
].sort(), 'Player records must contain only the generated identity, country, and private code verifier.')
assert.equal(player['x-schema'].fields.country.dbType, 'NVARCHAR(80)')
assert.deepEqual(player['x-schema'].constraints.uniqueConstraints.map(constraint => constraint.columns).sort(),
  [['name']], 'Generated names remain unique, while secret-code uniqueness is enforced by the entry transaction.')
assert.equal(config.entities.PlayerEntryState.source, 'PlayerEntryStates',
  'The generated entry-state table must match the transactional SQL implementation.')
console.log(`Generated ${expected.length} application entities with private Data API policies.`)
