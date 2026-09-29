"""
Generate heavier weights of a single-weight font with FontForge's "Change Weight".

Run it yourself (it is not wired into the build):

    fontforge -lang=py -script scripts/make-weights.py public/fonts/Lecta.otf public/fonts

Licence note for Lecta (see the font's name table, ID 13): modified versions must be
distributed under a DIFFERENT NAME and the same licence, may not be sold, and the font may
not be used by/with AI systems. Set NEW_FAMILY below to a name that is not "Lecta".
"""

import os
import sys

import fontforge
import psMat

# ---------------------------------------------------------------- configure
NEW_FAMILY = "Lekta"  # must not be the reserved name "Lecta"

# name, OS/2 weight class, extra stem thickness in font units (UPM is 1024).
# For reference: a 0.25px CSS text-stroke at 14px ≈ 0.25 / 14 * 1024 ≈ 18 units per side ≈ 36 total.
WEIGHTS = [
    ("Regular", 400, 0),  # original outlines, only renamed into the Lekta family
    ("Medium", 500, 24),
    ("SemiBold", 600, 40),
    ("Bold", 700, 60),
]

# "auto" lets FontForge balance counters; "retain" keeps counters and widens glyphs instead
# (closer to the letter-spacing you added by hand), "squish" keeps advance widths.
COUNTER_TYPE = "squish"

# Extra tracking (letter spacing) per glyph, in font units, split evenly on both sides.
# 1 unit ≈ 0.014px at 14px, so 8 units ≈ 0.11px — subtle.
EXTRA_TRACKING = {"Regular": 0, "Medium": 0, "SemiBold": 8, "Bold": 12}
# ---------------------------------------------------------------- end config


def main():
    if len(sys.argv) < 3:
        sys.exit("usage: fontforge -lang=py -script make-weights.py <source.otf> <out-dir>")
    src, out_dir = sys.argv[1], sys.argv[2]
    if NEW_FAMILY in ("CHANGE-ME", "") or NEW_FAMILY.strip().lower() == "lecta":
        sys.exit("Set NEW_FAMILY to a new name first (the licence reserves 'Lecta').")
    os.makedirs(out_dir, exist_ok=True)
    compact = NEW_FAMILY.replace(" ", "")

    for style, weight_class, stroke in WEIGHTS:
        font = fontforge.open(src)

        if stroke:
            font.selection.all()
            font.changeWeight(stroke, "auto", 0, 0, COUNTER_TYPE)
            font.removeOverlap()
            font.addExtrema()
            font.round()

        track = EXTRA_TRACKING.get(style, 0)
        if track:
            for glyph in font.glyphs():
                if glyph.width > 0:  # skip zero-width marks
                    width = glyph.width
                    glyph.transform(psMat.translate(track / 2, 0))
                    glyph.width = width + track

        font.familyname = NEW_FAMILY
        font.fontname = f"{compact}-{style}"
        font.fullname = f"{NEW_FAMILY} {style}"
        font.weight = style
        font.os2_weight = weight_class
        # Preferred family / subfamily so apps group the weights together.
        font.appendSFNTName("English (US)", "Family", NEW_FAMILY)
        font.appendSFNTName("English (US)", "SubFamily", style)
        font.appendSFNTName("English (US)", "Preferred Family", NEW_FAMILY)
        font.appendSFNTName("English (US)", "Preferred Styles", style)
        font.appendSFNTName("English (US)", "UniqueID", f"{compact}-{style}")
        # The copyright and licence strings (name IDs 0 and 13) carry over unchanged,
        # which the licence requires.

        base = os.path.join(out_dir, f"{compact}-{style}")
        font.generate(base + ".otf")
        try:
            font.generate(base + ".woff2")
        except Exception as err:  # FontForge builds without WOFF2 support
            print(f"  (skipped woff2: {err})")
        font.close()
        print(f"wrote {base}.otf  (weight {weight_class}, +{stroke} units)")


main()
