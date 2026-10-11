import { authenticated, date, entity, text, uuid } from '@microsoft/rayfin-core'

@entity()
@authenticated('read', { policy: (_claims, row) => row.id.neq(row.id) })
export class Player {
  @uuid() id!: string
  @text({ max: 96, unique: true }) name!: string
  @text({ max: 80 }) country!: string
  // The entry transaction enforces uniqueness. Legacy players without a code cannot return.
  @text({ max: 64, optional: true }) secretCodeHash?: string
  @date() createdAt!: Date
}
