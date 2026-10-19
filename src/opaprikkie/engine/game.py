from collections.abc import Sequence
from dataclasses import replace

from opaprikkie.engine.dice import roll, set_aside
from opaprikkie.engine.errors import IllegalAction, Rejection
from opaprikkie.engine.log import (
    DiceOffRoll,
    DiceOffRound,
    Log,
    LogEntry,
    NoMove,
    Roll,
    RollSequence,
)
from opaprikkie.engine.observation import legal_targets
from opaprikkie.engine.ruleset import Ruleset
from opaprikkie.engine.state import GameState, Phase

_DICE_OFF_DICE = 2


def new_game(ruleset: Ruleset, seed: int | str) -> tuple[GameState, Log]:
    board = dict.fromkeys(ruleset.targets, 0)
    return GameState(ruleset, seed, Phase.NAMING, (board,) * ruleset.players), ()


def name_players(
    state: GameState, names: Sequence[str], first_player: int | None = None
) -> tuple[GameState, Log]:
    """Runs the dice-off, or with `first_player` skips it and makes the first opening roll."""
    _require_phase(state, Phase.NAMING)
    state = replace(state, names=_validate_names(state.ruleset, names))
    if first_player is None:
        return _dice_off(state)
    _require_player(state, first_player)
    return _open(state, first_player, turn=1, continuation=0)


def choose_first_player(state: GameState, player: int) -> tuple[GameState, Log]:
    _require_phase(state, Phase.CHOOSING_FIRST_PLAYER)
    _require_player(state, player)
    return _open(state, player, turn=1, continuation=0)


def choose_target(state: GameState, target: int) -> tuple[GameState, Log]:
    """Resolves one roll sequence, then a continuation, the next turn, or the game end."""
    _require_phase(state, Phase.CHOOSING_TARGET)
    player = _current_player(state)
    _require_legal_target(state, player, target)
    sequence, roll_index = _roll_sequence(state, player, target)
    board = dict(state.pegs[player])
    board[target] += sequence.movement
    pegs = tuple(board if seat == player else rows for seat, rows in enumerate(state.pegs))
    state = replace(state, pegs=pegs, roll_index=roll_index)
    log = (sequence,)
    if all(row == state.ruleset.rows for row in board.values()):
        finished = replace(state, phase=Phase.FINISHED, winner=player, opening_roll=())
        return finished, log
    if board[target] == state.ruleset.rows:
        return _open(state, player, state.turn, state.continuation + 1, log)
    return _open(state, _next_player(state, player), state.turn + 1, 0, log)


def _dice_off(state: GameState) -> tuple[GameState, Log]:
    contenders = range(state.ruleset.players)
    roll_index = state.roll_index
    log: list[LogEntry] = []
    while len(contenders) > 1:
        rolls = []
        for player in contenders:
            dice = roll(state.seed, roll_index, _DICE_OFF_DICE, state.ruleset.dice_faces)
            rolls.append(DiceOffRoll(player, dice))
            roll_index += 1
        log.append(DiceOffRound(tuple(rolls)))
        high = max(sum(r.dice) for r in rolls)
        contenders = [r.player for r in rolls if sum(r.dice) == high]
    winner = replace(
        state,
        phase=Phase.CHOOSING_FIRST_PLAYER,
        current_player=contenders[0],
        roll_index=roll_index,
    )
    return winner, tuple(log)


def _open(
    state: GameState, player: int, turn: int, continuation: int, log: Log = ()
) -> tuple[GameState, Log]:
    """Makes opening rolls until one has a legal target, passing the turn on each that hasn't."""
    ruleset = state.ruleset
    entries = list(log)
    roll_index = state.roll_index
    while True:
        dice = roll(state.seed, roll_index, ruleset.dice_count, ruleset.dice_faces)
        roll_index += 1
        if legal_targets(ruleset, state.pegs[player], dice):
            break
        entries.append(NoMove(player, turn, continuation, dice))
        player, turn, continuation = _next_player(state, player), turn + 1, 0
    opened = replace(
        state,
        phase=Phase.CHOOSING_TARGET,
        roll_index=roll_index,
        current_player=player,
        turn=turn,
        continuation=continuation,
        opening_roll=dice,
    )
    return opened, tuple(entries)


def _roll_sequence(state: GameState, player: int, target: int) -> tuple[RollSequence, int]:
    ruleset = state.ruleset
    combo_size = ruleset.targets[target]
    distance = ruleset.rows - state.pegs[player][target]
    roll_index = state.roll_index
    dice, reset = state.opening_roll, False
    rolls = []
    matches = 0
    while True:
        taken = set_aside(ruleset, target, dice)
        rolls.append(Roll(dice, taken, reset))
        found = len(taken) // combo_size
        matches += found
        remaining = len(dice) - len(taken)
        if not found or matches >= distance:
            break
        reset = remaining == 0
        if reset:
            remaining = ruleset.dice_count
        if remaining < combo_size:
            break
        dice = roll(state.seed, roll_index, remaining, ruleset.dice_faces)
        roll_index += 1
    sequence = RollSequence(
        player,
        state.turn,
        state.continuation,
        target,
        tuple(rolls),
        matches,
        min(matches, distance),
    )
    return sequence, roll_index


def _validate_names(ruleset: Ruleset, names: Sequence[str]) -> tuple[str, ...]:
    if isinstance(names, str) or not all(isinstance(name, str) for name in names):
        raise IllegalAction(Rejection.INVALID_NAMES, "names must be a list of strings", rule="type")
    stripped = tuple(name.strip() for name in names)
    if len(stripped) != ruleset.players:
        raise IllegalAction(
            Rejection.INVALID_NAMES, f"expected {ruleset.players} names", rule="count"
        )
    if not all(stripped):
        raise IllegalAction(Rejection.INVALID_NAMES, "names can't be blank", rule="blank")
    return stripped


def _require_phase(state: GameState, phase: Phase) -> None:
    if state.phase is not phase:
        raise IllegalAction(
            Rejection.WRONG_PHASE,
            f"can't do that while {state.phase}",
            phase=state.phase.value,
        )


def _require_player(state: GameState, player: int) -> None:
    if not _is_int(player) or not 0 <= player < state.ruleset.players:
        raise IllegalAction(
            Rejection.INVALID_PLAYER,
            f"player {player} isn't in the game",
            players=state.ruleset.players,
        )


def _require_legal_target(state: GameState, player: int, target: int) -> None:
    pegs = state.pegs[player]
    legal = [t.target for t in legal_targets(state.ruleset, pegs, state.opening_roll)]
    if _is_int(target) and target in legal:
        return
    if not _is_int(target) or target not in pegs:
        reason = "not_a_target"
    elif pegs[target] == state.ruleset.rows:
        reason = "topped"
    else:
        reason = "no_match"
    raise IllegalAction(
        Rejection.ILLEGAL_TARGET,
        f"{target} isn't a legal target",
        legal_targets=tuple(legal),
        reason=reason,
    )


def _is_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool)


def _current_player(state: GameState) -> int:
    assert state.current_player is not None
    return state.current_player


def _next_player(state: GameState, player: int) -> int:
    return (player + 1) % state.ruleset.players
