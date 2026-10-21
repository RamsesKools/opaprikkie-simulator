# Opa Prikkie Simulator

[![CI](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/RamsesKools/opaprikkie-simulator/actions/workflows/ci.yml)

Play and simulate the famous Dutch dice game Opa Prikkie.

## About Opa Prikkie

Opa Prikkie is a traditional Dutch dice game where players race to move all their pegs (prikkies) to the top of their board first. The game involves:

- **2 wooden boards** (one per player)
- **12 pegs** (prikkies) per player
- **6 dice**

**Buy the real game from the official website: <https://opaprikkie.nl/>.**

The rules the engine implements are in [docs/game_rules.md](docs/game_rules.md).

## Status

A browser version is being built: a React frontend, an authoritative Python backend, and a simulator for strategies.
The plan is in [the roadmap](docs/roadmap/monorepo_mvp.md), and the work in issue [#30](https://github.com/RamsesKools/opaprikkie-simulator/issues/30).

## Setup

Install [uv](https://docs.astral.sh/uv/) and [Node](https://nodejs.org/) 24 (see `.nvmrc`), then:

```bash
git clone https://github.com/RamsesKools/opaprikkie-simulator.git
cd opaprikkie-simulator
uv sync
npm --prefix frontend ci
uv run pre-commit install
```

## Usage

```bash
# Start the backend on http://127.0.0.1:8000
uv run opaprikkie serve

# Play 1000 games of random versus random and print win rates, turns, continuations, and dead turns
uv run opaprikkie simulate random random --games 1000 --seed 42

# The same batch over HTTP, against a backend started with OPAPRIKKIE_DEV_MODE=true
uv run opaprikkie simulate random random --games 1000 --seed 42 --url http://127.0.0.1:8000

# Rank strategies with a round robin of head-to-head games (also takes --url)
uv run opaprikkie tournament random greedy smart highest sum rarest sloppy --games 1000 --seed 42

# Show all commands
uv run opaprikkie --help
```

Settings are `OPAPRIKKIE_*` environment variables, listed in [.env.example](.env.example).

### Docker

The app ships as one image on GHCR; Compose serves it on http://localhost:8000 (set `PORT` to change it).

```bash
# Laptop: build from source
docker compose up --build

# Homeserver: run the published image
docker compose pull && docker compose up -d
```

## Development

taskipy runs every common command; `uv run task --list` shows them all.

```bash
uv run task format  # format the code
uv run task check   # lint, type-check, module boundaries, and tests
uv run task dev     # backend and frontend with reload on http://localhost:5173
```

Layout, tooling, and conventions are in [docs/development](docs/development/conventions.md).

## License

This project is licensed under the MIT License; see [LICENSE](LICENSE).

## Acknowledgments

- Game rules based on the official [Opa Prikkie website](https://opaprikkie.nl/spelregels/).
- Developed as a learning project for game simulation and AI strategy development.
