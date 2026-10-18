"""NiceGUI frontend candidate for #6, calling apps/backend over the shared contract."""

import asyncio
import os
import random
from pathlib import Path
from typing import Any

import httpx
from nicegui import app, ui

BACKEND_URL = os.environ.get("BACKEND_URL", "http://127.0.0.1:8000")
OPPONENTS = {
    "smart": "AI: smart",
    "greedy": "AI: greedy",
    "random": "AI: random",
    "human": "Hot-seat",
}
THROW_S, PAUSE_S, SWITCH_S = 0.95, 0.7, 1.1

app.add_static_files("/assets", Path(__file__).parent / "static")


def label(p: int) -> str:
    return f"PLAYER {p + 1}"


def subtitle(player: dict[str, Any]) -> str:
    return f"AI: {player['strategy']}" if player["kind"] == "ai" else "Human"


def build_board(p: int) -> dict[str, Any]:
    with ui.element("section").classes(f"board wood-frame p{p + 1}") as root:
        root.props(f'aria-label="{label(p)} board"')
        with ui.element("div").classes("plaque"):
            ui.label(label(p))
            sub = ui.label("-").classes("sub")
        heads, pegs = [], []
        with ui.element("div").classes("board-grid"):
            for t in range(1, 13):
                heads.append(ui.label(str(t)).classes("col-head"))
            for t in range(1, 13):
                with ui.element("div").classes("peg-col").props(f'role="img" aria-label="peg {t}"'):
                    pegs.append(ui.element("div").classes("peg").style("bottom: 0px"))
    return {"root": root, "sub": sub, "heads": heads, "pegs": pegs}


@ui.page("/")
def index() -> None:
    ui.add_head_html('<link rel="stylesheet" href="/assets/pixel.css">')
    ui.add_css(".nicegui-content { padding: 0 !important; display: block !important; }")
    client = httpx.AsyncClient(base_url=BACKEND_URL)
    ui_state: dict[str, Any] = {"game_id": None, "state": None, "active": 0, "busy": False}
    dice: list[ui.element] = []

    with ui.element("main").classes("px-page w-full"):
        ui.label("Opa Prikkie (NiceGUI)").classes("px-title")

        with ui.element("div").classes("px-controls"):
            ui.label("Opponent")
            opponent = ui.select(OPPONENTS, value="smart")
            opponent.props('dense borderless square popup-content-class="px-menu"')
            ui.label("Seed")
            seed_input = ui.number(format="%d").props("dense borderless square")
            start_btn = ui.button("Start game", color=None).props("flat no-caps").classes("px-btn")

        with ui.element("div").classes("px-table"):
            board1 = build_board(0)
            with ui.element("section").classes("mat-box wood-frame").props('aria-label="dice mat"'):
                mat = ui.element("div").classes("mat")
                ribbon = ui.label("Pick an opponent and start a game.").classes("ribbon")
                ribbon.props('role="status" aria-live="polite"')
                targets = ui.element("div").classes("targets")
            board2 = build_board(1)
        boards = [board1, board2]

        log = ui.element("div").classes("log")

    def set_active(p: int) -> None:
        ui_state["active"] = p
        for i, b in enumerate(boards):
            if i == p:
                b["root"].classes(add="active")
            else:
                b["root"].classes(remove="active")

    def set_peg(p: int, target: int, pos: int) -> None:
        boards[p]["pegs"][target - 1].style(f"bottom: {pos * 24}px")

    def mark(p: int, legal: set[int], picked: int | None) -> None:
        for i, b in enumerate(boards):
            for t, head in enumerate(b["heads"], start=1):
                head.classes(remove="legal picked")
                if i == p and t in legal:
                    head.classes(add="legal")
                if i == p and t == picked:
                    head.classes(add="picked")

    def clear_dice() -> None:
        while dice:
            dice.pop().delete()

    async def throw(p: int, roll: list[int]) -> None:
        clear_dice()
        with mat:
            for i, v in enumerate(roll):
                fx = random.uniform(-420, -320) if p == 0 else random.uniform(320, 420)
                style = (
                    f"left: {(i % 3) * 112 + random.uniform(4, 38):.0f}px;"
                    f"top: {(i // 3) * 108 + random.uniform(4, 30):.0f}px;"
                    f"--face: {v - 1}; --rot: {random.uniform(-12, 12):.0f}deg;"
                    f"--fx: {fx:.0f}px; --fy: {random.uniform(40, 160):.0f}px;"
                    f"--spin: {random.uniform(-720, 720):.0f}deg;"
                    f"--td: {random.uniform(-0.15, 0):.2f}s"
                )
                die = ui.element("div").classes("die throw").style(style)
                dice.append(die.props(f'role="img" aria-label="die showing {v}"'))
        await asyncio.sleep(THROW_S)

    async def switch_to(p: int) -> None:
        if ui_state["active"] == p:
            return
        with mat:
            banner = ui.label(label(p)).classes(f"switch p{p + 1}")
        await asyncio.sleep(SWITCH_S / 2)
        set_active(p)
        clear_dice()
        await asyncio.sleep(SWITCH_S / 2)
        banner.delete()

    async def replay(prev: dict[str, Any] | None, nxt: dict[str, Any]) -> None:
        events = nxt["history"][len(prev["history"]) if prev else 0 :]
        for i, e in enumerate(events):
            p = e["player"]
            own_choice = i == 0 and prev is not None and p == prev["current_player"]
            await switch_to(p)
            if not own_choice:
                ribbon.text = f"{label(p)} throws..."
                await throw(p, e["roll"])
            if e["outcome"] == "skipped":
                ribbon.text = f"{label(p)} has no move. Skipped!"
                await asyncio.sleep(PAUSE_S * 2)
                continue
            mark(p, set(), e["target"])
            ribbon.text = f"{label(p)} goes for {e['target']}"
            await asyncio.sleep(PAUSE_S)
            set_peg(p, e["target"], e["peg_after"])
            if e["moves"]:
                ribbon.text = f"Peg {e['target']} climbs {e['moves']}!"
            else:
                ribbon.text = f"No luck: peg {e['target']} stays put"
            await asyncio.sleep(PAUSE_S * 1.5)
            mark(p, set(), None)
        if nxt["status"] == "finished":
            ribbon.text = f"{label(nxt['winner'])} WINS!"
            ribbon.classes(add="win")
        else:
            current = nxt["current_player"]
            await switch_to(current)
            ribbon.text = f"{label(current)} throws..."
            await throw(current, nxt["roll"])
            ribbon.text = f"{label(current)}: pick a target"
            mark(current, {t["target"] for t in nxt["legal_targets"]}, None)
            show_targets(nxt)
        for p, player in enumerate(nxt["players"]):
            for peg in player["pegs"]:
                set_peg(p, peg["target"], peg["position"])
        render_log(nxt["history"])

    def show_targets(state: dict[str, Any]) -> None:
        targets.clear()
        with targets:
            for t in state["legal_targets"]:
                ui.button(
                    f"{t['target']} x{t['count']}",
                    on_click=lambda t=t["target"]: choose(t),
                    color=None,
                ).props("flat no-caps").classes("px-btn")

    def render_log(history: list[dict[str, Any]]) -> None:
        log.clear()
        log.set_visibility(bool(history))
        with log:
            ui.label("Recent turns")
            for e in reversed(history[-5:]):
                who = f"T{e['turn']} {label(e['player'])} rolled {e['roll']}"
                if e["outcome"] == "skipped":
                    ui.label(f"{who}: skipped")
                else:
                    won = " and WON" if e["outcome"] == "won" else ""
                    ui.label(f"{who}, chose {e['target']}, +{e['moves']}{won}")

    async def run(method: str, path: str, body: dict[str, Any], fresh: bool) -> None:
        if ui_state["busy"]:
            return
        ui_state["busy"] = True
        start_btn.disable()
        targets.clear()
        r = await client.request(method, path, json=body)
        if not r.is_success:
            ribbon.text = f"Error: {r.json().get('detail', r.text)}"
        else:
            data = r.json()
            prev = None if fresh else ui_state["state"]
            if fresh:
                clear_dice()
                set_active(0)
                ribbon.classes(remove="win")
                for p, b in enumerate(boards):
                    b["sub"].text = subtitle(data["state"]["players"][p])
                    for t in range(1, 13):
                        set_peg(p, t, 0)
            ui_state.update(game_id=data["game_id"], state=data["state"])
            await replay(prev, data["state"])
        ui_state["busy"] = False
        start_btn.enable()

    async def start() -> None:
        seed = int(seed_input.value) if seed_input.value not in (None, "") else None
        await run("POST", "/games", {"opponent": opponent.value, "seed": seed}, fresh=True)

    async def choose(target: int) -> None:
        await run("POST", f"/games/{ui_state['game_id']}/moves", {"target": target}, fresh=False)

    start_btn.on_click(start)


def main() -> None:
    ui.run(
        host="127.0.0.1",
        port=int(os.environ.get("NICEGUI_PORT", "8081")),
        show=False,
        reload=False,
        title="Opa Prikkie",
    )
