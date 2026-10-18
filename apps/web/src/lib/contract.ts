import type { components } from './api';

type Schemas = components['schemas'];
export type GameResponse = Schemas['GameResponse'];
export type GameState = Schemas['GameState'];
export type PlayerView = Schemas['PlayerView'];
export type TurnEvent = Schemas['TurnEvent'];
export type Opponent = NonNullable<Schemas['NewGameRequest']['opponent']>;

async function call(path: string, body: unknown): Promise<GameResponse> {
	const r = await fetch(`/api${path}`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
	if (!r.ok) throw new Error((await r.json()).detail ?? r.statusText);
	return r.json();
}

export const newGame = (opponent: Opponent, seed: number | null) =>
	call('/games', { opponent, seed });

export const chooseTarget = (gameId: string, target: number) =>
	call(`/games/${gameId}/moves`, { target });
