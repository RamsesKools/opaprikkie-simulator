<script lang="ts">
	import { chooseTarget, newGame, type GameState, type Opponent, type TurnEvent } from '#lib/contract.ts';

	const THROW_MS = 950;
	const PAUSE_MS = 700;
	const SWITCH_MS = 1100;

	const opponents: Record<Opponent, string> = {
		smart: 'AI: smart',
		greedy: 'AI: greedy',
		random: 'AI: random',
		human: 'Hot-seat'
	};

	type Die = { face: number; left: number; top: number; rot: number; fx: number; fy: number; spin: number; td: number };

	let opponent = $state<Opponent>('smart');
	let seed = $state<number | null>(null);
	let gameId = $state<string | null>(null);
	let game = $state<GameState | null>(null);
	let error = $state<string | null>(null);
	let busy = $state(false);

	let pegs = $state<number[][]>([Array(12).fill(0), Array(12).fill(0)]);
	let active = $state(0);
	let picked = $state<number | null>(null);
	let dice = $state<Die[]>([]);
	let throwId = $state(0);
	let switchTo = $state<number | null>(null);
	let switchId = $state(0);
	let ribbon = $state('Pick an opponent and start a game.');
	let showTargets = $state(false);
	let log = $state<TurnEvent[]>([]);

	const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
	const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
	const label = (p: number) => `PLAYER ${p + 1}`;

	function subtitle(p: number): string {
		const player = game?.players[p];
		if (!player) return '';
		return player.kind === 'ai' ? `AI: ${player.strategy}` : 'Human';
	}

	async function throwDice(player: number, roll: number[]) {
		dice = roll.map((v, i) => ({
			face: v - 1,
			left: (i % 3) * 112 + rand(4, 38),
			top: Math.floor(i / 3) * 108 + rand(4, 30),
			rot: rand(-12, 12),
			fx: player === 0 ? rand(-420, -320) : rand(320, 420),
			fy: rand(40, 160),
			spin: rand(-720, 720),
			td: rand(-0.15, 0)
		}));
		throwId++;
		await sleep(THROW_MS);
	}

	async function switchPlayer(player: number) {
		if (active === player) return;
		switchTo = player;
		switchId++;
		await sleep(SWITCH_MS / 2);
		active = player;
		dice = [];
		await sleep(SWITCH_MS / 2);
		switchTo = null;
	}

	async function replay(prev: GameState | null, next: GameState) {
		const events = next.history.slice(prev?.history.length ?? 0);
		for (const [i, e] of events.entries()) {
			const ownChoice = i === 0 && prev !== null && e.player === prev.current_player;
			await switchPlayer(e.player);
			if (!ownChoice) {
				ribbon = `${label(e.player)} throws...`;
				await throwDice(e.player, e.roll);
			}
			if (e.outcome === 'skipped') {
				ribbon = `${label(e.player)} has no move. Skipped!`;
				await sleep(PAUSE_MS * 2);
				continue;
			}
			picked = e.target;
			ribbon = `${label(e.player)} goes for ${e.target}`;
			await sleep(PAUSE_MS);
			pegs[e.player][e.target! - 1] = e.peg_after!;
			ribbon = e.moves ? `Peg ${e.target} climbs ${e.moves}!` : `No luck: peg ${e.target} stays put`;
			await sleep(PAUSE_MS * 1.5);
			picked = null;
		}
		if (next.status === 'finished') {
			ribbon = `${label(next.winner!)} WINS!`;
		} else {
			await switchPlayer(next.current_player);
			ribbon = `${label(next.current_player)} throws...`;
			await throwDice(next.current_player, next.roll);
			ribbon = `${label(next.current_player)}: pick a target`;
			showTargets = true;
		}
		pegs = next.players.map((p) => p.pegs.map((g) => g.position));
		log = next.history;
	}

	async function run(action: () => ReturnType<typeof newGame>, fresh: boolean) {
		busy = true;
		showTargets = false;
		try {
			const r = await action();
			const prev = fresh ? null : game;
			if (fresh) {
				pegs = [Array(12).fill(0), Array(12).fill(0)];
				active = 0;
				dice = [];
				log = [];
			}
			gameId = r.game_id;
			game = r.state;
			error = null;
			await replay(prev, r.state);
		} catch (e) {
			error = (e as Error).message;
		}
		busy = false;
	}

	function describe(e: TurnEvent): string {
		if (e.outcome === 'skipped') return `T${e.turn} ${label(e.player)} rolled [${e.roll}]: skipped`;
		const won = e.outcome === 'won' ? ' and WON' : '';
		return `T${e.turn} ${label(e.player)} rolled [${e.roll}], chose ${e.target}, +${e.moves}${won}`;
	}
</script>

<svelte:head>
	<title>Opa Prikkie SvelteKit</title>
</svelte:head>

<main class="px-page">
	<h1 class="px-title">Opa Prikkie (SvelteKit)</h1>

	<form class="px-controls" onsubmit={(e) => { e.preventDefault(); run(() => newGame(opponent, seed), true); }}>
		<label>Opponent
			<select class="px-input" bind:value={opponent}>
				{#each Object.entries(opponents) as [value, text] (value)}
					<option {value}>{text}</option>
				{/each}
			</select>
		</label>
		<label>Seed <input class="px-input" type="number" bind:value={seed} /></label>
		<button class="px-btn" type="submit" disabled={busy}>Start game</button>
	</form>

	{#if error}<p class="ribbon">Error: {error}</p>{/if}

	<div class="px-table">
		{#snippet board(p: number)}
			<section class="board wood-frame p{p + 1}" class:active={game && active === p} aria-label="{label(p)} board">
				<div class="plaque">{label(p)}<small>{subtitle(p) || '-'}</small></div>
				<div class="board-grid">
					{#each pegs[p] as _, t (t)}
						<div class="col-head" class:legal={showTargets && active === p && game?.legal_targets.some((l) => l.target === t + 1)} class:picked={active === p && picked === t + 1}>{t + 1}</div>
					{/each}
					{#each pegs[p] as pos, t (t)}
						<div class="peg-col" role="img" aria-label="peg {t + 1} at {pos} of 5">
							<div class="peg" style:bottom="{pos * 24}px"></div>
						</div>
					{/each}
				</div>
			</section>
		{/snippet}

		{@render board(0)}

		<section class="mat-box wood-frame" aria-label="dice mat">
			<div class="mat">
				{#key throwId}
					{#each dice as d, i (i)}
						<div
							class="die throw"
							role="img"
							aria-label="die showing {d.face + 1}"
							style:left="{d.left}px"
							style:top="{d.top}px"
							style:--face={d.face}
							style:--rot="{d.rot}deg"
							style:--fx="{d.fx}px"
							style:--fy="{d.fy}px"
							style:--spin="{d.spin}deg"
							style:--td="{d.td}s"
						></div>
					{/each}
				{/key}
				{#key switchId}
					{#if switchTo !== null}<div class="switch p{switchTo + 1}">{label(switchTo)}</div>{/if}
				{/key}
			</div>
			<p class="ribbon" class:win={game?.status === 'finished' && !busy} role="status" aria-live="polite">{ribbon}</p>
			<div class="targets">
				{#if showTargets && game && gameId}
					{#each game.legal_targets as t (t.target)}
						<button class="px-btn" disabled={busy} onclick={() => run(() => chooseTarget(gameId!, t.target), false)}>{t.target} x{t.count}</button>
					{/each}
				{/if}
			</div>
		</section>

		{@render board(1)}
	</div>

	{#if log.length}
		<div class="log">
			Recent turns
			<ol reversed>
				{#each log.slice(-5).reverse() as e, i (i)}<li>{describe(e)}</li>{/each}
			</ol>
		</div>
	{/if}
</main>
