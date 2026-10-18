import type { TurnEvent } from './contract'

export const label = (p: number) => `PLAYER ${p + 1}`

export function describe(e: TurnEvent): string {
  const who = `T${e.turn} ${label(e.player)} rolled [${e.roll}]`
  if (e.outcome === 'skipped') return `${who}: skipped`
  const won = e.outcome === 'won' ? ' and WON' : ''
  return `${who}, chose ${e.target}, +${e.moves}${won}`
}
