"""Generates the pixel art in src/opaprikkie_web/static. Run: uv run scripts/make_assets.py"""

import random
from pathlib import Path

from PIL import Image

ASSETS = Path(__file__).parents[1] / "src" / "opaprikkie_web" / "static"


def hexrgba(color: str) -> tuple[int, int, int, int]:
    return (int(color[1:3], 16), int(color[3:5], 16), int(color[5:7], 16), 255)


def sprite(rows: list[str], palette: dict[str, str]) -> Image.Image:
    im = Image.new("RGBA", (len(rows[0]), len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch in palette:
                im.putpixel((x, y), hexrgba(palette[ch]))
    return im


def grain(colors: list[str], seed: int, size: int = 16) -> Image.Image:
    """Horizontal wood grain tile that wraps seamlessly."""
    rng = random.Random(seed)
    im = Image.new("RGBA", (size, size), hexrgba(colors[1]))
    for y in range(size):
        band = colors[0] if y % 5 == 0 else colors[1] if y % 5 in (1, 3) else colors[2]
        for x in range(size):
            im.putpixel((x, y), hexrgba(band if rng.random() > 0.15 else colors[1]))
    for _ in range(3):
        x, y = rng.randrange(size), rng.randrange(size)
        im.putpixel((x, y), hexrgba(colors[3]))
        im.putpixel(((x + 1) % size, y), hexrgba(colors[3]))
    return im


def felt(seed: int, size: int = 8) -> Image.Image:
    rng = random.Random(seed)
    greens = ["#2f7d34", "#2b7430", "#33873a", "#2f7d34", "#2f7d34"]
    im = Image.new("RGBA", (size, size))
    for y in range(size):
        for x in range(size):
            im.putpixel((x, y), hexrgba(rng.choice(greens)))
    return im


def frame() -> Image.Image:
    """12x12 nine-slice wooden frame, 4px border, transparent centre."""
    shades = {0: "#2a170a", 2: "#b5763a", 3: "#5c3418"}
    im = Image.new("RGBA", (12, 12), (0, 0, 0, 0))
    for y in range(12):
        for x in range(12):
            d = min(x, y, 11 - x, 11 - y)
            if d > 3 or (d == 0 and x in (0, 11) and y in (0, 11)):
                continue
            if d == 1:
                color = "#e0a868" if x + y < 12 else "#7a4620"
            else:
                color = shades[d]
            im.putpixel((x, y), hexrgba(color))
    return im


HOLE = [
    "........",
    "..xxxx..",
    ".xXXXXx.",
    ".xXXXXx.",
    ".xXXXXx.",
    "..xxxx..",
    "........",
    "........",
]
PEG = [
    "........",
    "..oooo..",
    ".oLLCCo.",
    ".oLCCCo.",
    ".oCCCDo.",
    "..oooo..",
    "........",
    "........",
]
PEG_COLORS = {
    "p1": {"C": "#d83a3a", "L": "#ff9a8a", "D": "#8f1f1f"},
    "p2": {"C": "#3a6fd8", "L": "#9ac0ff", "D": "#1f3f8f"},
}


def dice_strip() -> Image.Image:
    """Slice the six large faces (CC-BY 4.0, Vircon32) into one horizontal strip."""
    sheet = Image.open(ASSETS / "dice-sheet.png").convert("RGBA")
    strip = Image.new("RGBA", (35 * 6, 37), (0, 0, 0, 0))
    for face in range(6):
        x0 = (3, 41, 79)[face % 3]
        y0 = (3, 43)[face // 3]
        strip.paste(sheet.crop((x0, y0, x0 + 35, y0 + 37)), (35 * face, 0))
    return strip


def main() -> None:
    grain(["#c98c4c", "#b5763a", "#a8692f", "#7a4620"], seed=1).save(ASSETS / "wood.png")
    grain(["#4a2a14", "#3f2310", "#38200e", "#26150a"], seed=2).save(ASSETS / "table.png")
    felt(seed=3).save(ASSETS / "felt.png")
    frame().save(ASSETS / "frame.png")
    sprite(HOLE, {"x": "#2a170a", "X": "#140b04", "h": "#d9a465"}).save(ASSETS / "hole.png")
    for name, colors in PEG_COLORS.items():
        sprite(PEG, {"o": "#1a0d06", **colors}).save(ASSETS / f"peg-{name}.png")
    dice_strip().save(ASSETS / "dice.png")


if __name__ == "__main__":
    main()
