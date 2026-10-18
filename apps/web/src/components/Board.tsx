import { label } from '../lib/format'

type Props = {
  player: number
  subtitle: string
  pegs: number[]
  active: boolean
  legal: Set<number>
  picked: number | null
}

export function Board({ player, subtitle, pegs, active, legal, picked }: Props) {
  return (
    <section
      className={`board wood-frame p${player + 1}${active ? ' active' : ''}`}
      aria-label={`${label(player)} board`}
    >
      <div className="plaque">
        {label(player)}
        <small>{subtitle}</small>
      </div>
      <div className="board-grid">
        {pegs.map((_, t) => {
          const cls = legal.has(t + 1) ? ' legal' : picked === t + 1 ? ' picked' : ''
          return (
            <div key={`head-${t}`} className={`col-head${cls}`}>
              {t + 1}
            </div>
          )
        })}
        {pegs.map((pos, t) => (
          <div key={`col-${t}`} className="peg-col" role="img" aria-label={`peg ${t + 1} at ${pos} of 5`}>
            <div className="peg" style={{ bottom: pos * 24 }} />
          </div>
        ))}
      </div>
    </section>
  )
}
