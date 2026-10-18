import { useRef, useState, type FormEvent } from 'react'
import { Board } from './components/Board'
import { DiceMat, type Die } from './components/DiceMat'
import { PixelSelect } from './components/PixelSelect'
import { chooseTarget, newGame, type GameResponse, type GameState, type Opponent, type TurnEvent } from './lib/contract'
import { describe, label } from './lib/format'

const THROW_MS = 950
const PAUSE_MS = 700
const SWITCH_MS = 1100

const opponents: Record<Opponent, string> = {
  smart: 'AI: smart',
  greedy: 'AI: greedy',
  random: 'AI: random',
  human: 'Hot-seat',
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo)
const emptyPegs = () => [Array<number>(12).fill(0), Array<number>(12).fill(0)]
const NO_TARGETS = new Set<number>()

export default function App() {
  const [opponent, setOpponent] = useState<Opponent>('smart')
  const [seed, setSeed] = useState('')
  const [gameId, setGameId] = useState<string | null>(null)
  const [game, setGame] = useState<GameState | null>(null)
  const [busy, setBusy] = useState(false)

  const [pegs, setPegs] = useState(emptyPegs)
  const [active, setActive] = useState(0)
  // Read inside the async timeline, where the `active` state would be stale.
  const activeRef = useRef(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [dice, setDice] = useState<Die[]>([])
  const [throwId, setThrowId] = useState(0)
  const [switchTo, setSwitchTo] = useState<number | null>(null)
  const [switchId, setSwitchId] = useState(0)
  const [ribbon, setRibbon] = useState('Pick an opponent and start a game.')
  const [showTargets, setShowTargets] = useState(false)
  const [log, setLog] = useState<TurnEvent[]>([])

  function activate(p: number) {
    activeRef.current = p
    setActive(p)
  }

  function subtitle(p: number): string {
    const player = game?.players[p]
    if (!player) return '-'
    return player.kind === 'ai' ? `AI: ${player.strategy}` : 'Human'
  }

  async function throwDice(player: number, roll: number[]) {
    setDice(
      roll.map((v, i) => ({
        face: v - 1,
        left: (i % 3) * 112 + rand(4, 38),
        top: Math.floor(i / 3) * 108 + rand(4, 30),
        rot: rand(-12, 12),
        fx: player === 0 ? rand(-420, -320) : rand(320, 420),
        fy: rand(40, 160),
        spin: rand(-720, 720),
        td: rand(-0.15, 0),
      })),
    )
    setThrowId((n) => n + 1)
    await sleep(THROW_MS)
  }

  async function switchPlayer(player: number) {
    if (activeRef.current === player) return
    setSwitchTo(player)
    setSwitchId((n) => n + 1)
    await sleep(SWITCH_MS / 2)
    activate(player)
    setDice([])
    await sleep(SWITCH_MS / 2)
    setSwitchTo(null)
  }

  async function replay(prev: GameState | null, next: GameState) {
    const events = next.history.slice(prev?.history.length ?? 0)
    for (const [i, e] of events.entries()) {
      const ownChoice = i === 0 && prev !== null && e.player === prev.current_player
      await switchPlayer(e.player)
      if (!ownChoice) {
        setRibbon(`${label(e.player)} throws...`)
        await throwDice(e.player, e.roll)
      }
      if (e.outcome === 'skipped') {
        setRibbon(`${label(e.player)} has no move. Skipped!`)
        await sleep(PAUSE_MS * 2)
        continue
      }
      const target = e.target!
      setPicked(target)
      setRibbon(`${label(e.player)} goes for ${target}`)
      await sleep(PAUSE_MS)
      setPegs((ps) => ps.map((row, p) => (p === e.player ? row.map((v, t) => (t === target - 1 ? e.peg_after! : v)) : row)))
      setRibbon(e.moves ? `Peg ${target} climbs ${e.moves}!` : `No luck: peg ${target} stays put`)
      await sleep(PAUSE_MS * 1.5)
      setPicked(null)
    }
    if (next.status === 'finished') {
      setRibbon(`${label(next.winner!)} WINS!`)
    } else {
      await switchPlayer(next.current_player)
      setRibbon(`${label(next.current_player)} throws...`)
      await throwDice(next.current_player, next.roll)
      setRibbon(`${label(next.current_player)}: pick a target`)
      setShowTargets(true)
    }
    setPegs(next.players.map((p) => p.pegs.map((g) => g.position)))
    setLog(next.history)
  }

  async function run(action: () => Promise<GameResponse>, fresh: boolean) {
    setBusy(true)
    setShowTargets(false)
    try {
      const r = await action()
      const prev = fresh ? null : game
      if (fresh) {
        setPegs(emptyPegs())
        activate(0)
        setDice([])
        setLog([])
      }
      setGameId(r.game_id)
      setGame(r.state)
      await replay(prev, r.state)
    } catch (e) {
      setRibbon(`Error: ${(e as Error).message}`)
    }
    setBusy(false)
  }

  function start(e: FormEvent) {
    e.preventDefault()
    run(() => newGame(opponent, seed === '' ? null : Number(seed)), true)
  }

  const legal = new Set(showTargets ? game?.legal_targets.map((t) => t.target) : [])
  const board = (p: number) => (
    <Board
      player={p}
      subtitle={subtitle(p)}
      pegs={pegs[p]}
      active={game !== null && active === p}
      legal={active === p ? legal : NO_TARGETS}
      picked={active === p ? picked : null}
    />
  )

  return (
    <main className="px-page">
      <h1 className="px-title">Opa Prikkie (React)</h1>

      <form className="px-controls" onSubmit={start}>
        <PixelSelect label="Opponent" value={opponent} options={opponents} onChange={setOpponent} disabled={busy} />
        <label>
          Seed <input className="px-input" type="number" value={seed} onChange={(e) => setSeed(e.target.value)} />
        </label>
        <button className="px-btn" type="submit" disabled={busy}>
          Start game
        </button>
      </form>

      <div className="px-table">
        {board(0)}
        <DiceMat dice={dice} throwId={throwId} switchTo={switchTo} switchId={switchId}>
          <p
            className={`ribbon${game?.status === 'finished' && !busy ? ' win' : ''}`}
            role="status"
            aria-live="polite"
          >
            {ribbon}
          </p>
          <div className="targets">
            {showTargets &&
              gameId &&
              game?.legal_targets.map((t) => (
                <button
                  key={t.target}
                  className="px-btn"
                  disabled={busy}
                  onClick={() => run(() => chooseTarget(gameId, t.target), false)}
                >
                  {t.target} x{t.count}
                </button>
              ))}
          </div>
        </DiceMat>
        {board(1)}
      </div>

      {log.length > 0 && (
        <div className="log">
          Recent turns
          <ol reversed>
            {log
              .slice(-5)
              .reverse()
              .map((e) => (
                <li key={`${e.turn}-${e.player}`}>{describe(e)}</li>
              ))}
          </ol>
        </div>
      )}
    </main>
  )
}
