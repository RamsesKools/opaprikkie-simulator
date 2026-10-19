from collections import defaultdict
from collections.abc import Sequence
from random import Random

from opaprikkie.engine.ruleset import Ruleset


def roll(seed: int | str, roll_index: int, count: int, faces: int) -> tuple[int, ...]:
    rng = Random(f"{seed}:{roll_index}")
    return tuple(rng.randint(1, faces) for _ in range(count))


def set_aside(ruleset: Ruleset, target: int, dice: Sequence[int]) -> tuple[int, ...]:
    """Indices of the dice matching `target`, lowest first."""
    indices: dict[int, list[int]] = defaultdict(list)
    for index, value in enumerate(dice):
        indices[value].append(index)
    if ruleset.targets[target] == 1:
        return tuple(indices[target])
    taken: list[int] = []
    for value in range(1, (target + 1) // 2):
        pairs = min(len(indices[value]), len(indices[target - value]))
        taken += indices[value][:pairs] + indices[target - value][:pairs]
    if target % 2 == 0:
        half = indices[target // 2]
        taken += half[: len(half) // 2 * 2]
    return tuple(sorted(taken))


def count_matches(ruleset: Ruleset, target: int, dice: Sequence[int]) -> int:
    return len(set_aside(ruleset, target, dice)) // ruleset.targets[target]
