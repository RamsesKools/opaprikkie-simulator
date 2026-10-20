# Simulation paths benchmark (issue #12)

Measured on 2026-10-20: the same seeded batches through `opaprikkie simulate` in-process and over HTTP.
This is evidence only; picking the default is [#13](https://github.com/RamsesKools/opaprikkie-simulator/issues/13).

## TL;DR

- Parity: every run printed the identical summary on both paths, for both matchups and all batch sizes.
- Throughput: in-process runs about 140 to 150 games/s, HTTP about 14 to 16, so in-process is roughly 10x faster.
- Startup: about 0.27 s per CLI run in-process, 0.37 s over HTTP, plus 0.4 to 0.5 s once to start the server.
- HTTP needs a running dev-mode backend of the same version, and a lost server ends the batch with no partial result.

## Method

- `uv run task bench_sim` runs [`scripts/bench_sim.py`](../../scripts/bench_sim.py).
- It starts `opaprikkie serve` with `OPAPRIKKIE_DEV_MODE=true` on a free port, output discarded, and times it until `/api/health` answers.
- For each matchup (random vs random, smart vs greedy) and batch size (1, 50, 500 games), it runs `opaprikkie simulate <a> <b> -n <games> -s bench` 3 times in-process and 3 times with `--url`.
- Each run is a fresh CLI process timed wall clock, so the times include interpreter start and imports; the table shows the median.
- Parity means all 6 summaries of a row pair are byte-identical; the script exits 1 otherwise.
- Options: `--games 1 50 500`, `--repeats 3`, `--seed bench`. The whole run takes about 4 minutes, almost all of it HTTP.
- Log-level parity of single games is already covered by `tests/cross_module/test_http_parity.py`.

## Machine and versions

- Apple M1 Pro, macOS 26.6.2, arm64.
- CPython 3.13.16, opaprikkie 0.4.0 at `b8b476f`, uvicorn single worker on 127.0.0.1, client and server on the same machine.
- Another workspace's idle `task dev` (uvicorn and Vite) was running alongside.

## Results

From `b8b476f`, server startup 0.38 s.

| Matchup | Games | Path | Median s | Games/s | Parity |
| -- | -- | -- | -- | -- | -- |
| random vs random | 1 | in-process | 0.25 | 4.0 | same |
| random vs random | 1 | HTTP | 0.35 | 2.9 | same |
| random vs random | 50 | in-process | 0.56 | 89.2 | same |
| random vs random | 50 | HTTP | 3.53 | 14.1 | same |
| random vs random | 500 | in-process | 3.36 | 148.9 | same |
| random vs random | 500 | HTTP | 36.20 | 13.8 | same |
| smart vs greedy | 1 | in-process | 0.29 | 3.4 | same |
| smart vs greedy | 1 | HTTP | 0.38 | 2.6 | same |
| smart vs greedy | 50 | in-process | 0.60 | 83.1 | same |
| smart vs greedy | 50 | HTTP | 3.41 | 14.7 | same |
| smart vs greedy | 500 | in-process | 3.58 | 139.5 | same |
| smart vs greedy | 500 | HTTP | 35.84 | 13.9 | same |

- The 1-game rows are mostly startup: about 0.26 s of Python start and imports, plus about 0.1 s over HTTP for the handshake, session, and first requests.
- Marginal rate from 50 to 500 games: about 150 to 160 games/s in-process and 14 over HTTP.
- An earlier run on the same machine had HTTP at 14.3 to 16.3 games/s and in-process within 3% of this one, so expect about 10% noise on HTTP.
- A random vs random game took 67 requests on average (new game, names, and 65 target choices, counted from the access log over 50 games), so HTTP costs about 1 ms per request.
- A manual 1000-game random vs random run took 6.8 s in-process and 79 s over HTTP, with the server logging to a file.

## Operational differences

|  | In-process | HTTP |
| -- | -- | -- |
| Needs | the package | a running backend, started separately |
| Dev mode | not involved | required, since the simulator sends seeds |
| Version | the installed package | handshake on `/api/health` must match exactly |
| Sessions | none | one per batch, all games in it, one of `MAX_SESSIONS` |
| Throughput | about 150 games/s | about 15 games/s |
| Exercises | the engine | the engine plus the API, models, and sessions |

Failure modes, all observed or read from `opaprikkie.sim.http`:

- No server: `Error: can't reach the backend at http://127.0.0.1:8766: [Errno 61] Connection refused`, exit 1.
- Server not in dev mode: `Error: seeded games need a backend in dev mode (OPAPRIKKIE_DEV_MODE)`, exit 1.
- Version mismatch: `backend runs <x>, the simulator <y>`, exit 1.
- Server stopped mid-batch: the same connection error and no summary, so the finished games are lost; sessions live in memory, so a restart can't resume either.
- Any other non-2xx answer is a `BackendError`, and an illegal choice raises `IllegalAction` on both paths.
- The backend runs as a single uvicorn worker ([HTTP API](../architecture/http_api.md#sessions)), so parallel batches against one server share it.
