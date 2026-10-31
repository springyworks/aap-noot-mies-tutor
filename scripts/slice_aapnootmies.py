#!/usr/bin/env python3
"""
Slices the classic Dutch Hoogeveen / Cornelis Jetses 'Leesplankje' (Aap-Noot-Mies)
source image (1200x1178.jpg) into:
  - public/aapnootmies/leesplankje_original.jpg
  - public/aapnootmies/leesplankje_board.png (full board without packaging footer)
  - public/aapnootmies/<word>.png & .jpg for all 17 classic figures
  - public/aapnootmies/contact_sheet.png (visual verification sheet)
  - src/aapNootMiesAssets.ts (TypeScript asset dictionary with file paths & embedded base64 data URIs)
"""

import base64
import io
import json
import os
import shutil
from PIL import Image, ImageDraw

SOURCE_IMAGE = "1200x1178.jpg"
OUT_DIR = os.path.join("public", "aapnootmies")
TS_OUT_FILE = os.path.join("src", "aapNootMiesAssets.ts")

# Pixel-perfect bounding boxes (left, top, right, bottom) for the 17 illustration panels
# Excludes the yellow wooden frame borders and the word label boxes below each figure.
FIGURE_SPECS = [
    # Row 1 (6 figures)
    ("aap",     (4,    63,  165, 217), "Aap op het dak",            "Monkey on perch"),
    ("noot",    (200,  63,  371, 217), "Walnoot op tafel",          "Walnut on table"),
    ("mies",    (406,  63,  577, 217), "Poes Mies bij de schutting","Cat Mies by fence"),
    ("wim",     (612,  63,  783, 217), "Wim speelt met blokken",    "Wim playing with blocks"),
    ("zus",     (818,  63,  989, 217), "Zus in de kinderstoel",     "Sister Zus in highchair"),
    ("jet",     (1026, 63,  1194, 217),"Jet kleedt haar pop aan",   "Jet dressing her doll"),
    # Row 2 (6 figures)
    ("teun",    (4,    331, 165, 488), "Oude Teun met hoed en stok","Old Teun with hat and cane"),
    ("vuur",    (200,  331, 371, 488), "Brandende vuurkorf",        "Burning fire brazier"),
    ("gijs",    (406,  331, 577, 488), "Gijs met de schop",         "Gijs with shovel"),
    ("lam",     (612,  331, 783, 488), "Wit lammetje in de wei",    "White lamb in meadow"),
    ("kees",    (818,  331, 989, 488), "Witte keeshond Kees",       "White spitz dog Kees"),
    ("bok",     (1026, 331, 1194, 488),"Bok voor de bokkenwagen",   "Billy goat pulling cart"),
    # Row 3 (5 figures; weide & schapen are wide landscape panels)
    ("weide",   (4,    598, 266, 752), "Hollandse weide met koe",   "Dutch meadow with cow"),
    ("does",    (305,  598, 475, 752), "Zwarte poedel Does",        "Black poodle Does"),
    ("hok",     (510,  598, 680, 752), "Groen dierenhok",           "Green animal house"),
    ("duif",    (716,  598, 888, 752), "Duif op de dakpannen",      "Pigeon on roof tiles"),
    ("schapen", (926,  598, 1194, 752),"Kudde schapen onder boom",  "Flock of sheep under tree"),
]


def main() -> None:
    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs("src", exist_ok=True)

    src_path = SOURCE_IMAGE if os.path.exists(SOURCE_IMAGE) else os.path.join(OUT_DIR, "leesplankje_original.jpg")
    if not os.path.exists(src_path):
        raise FileNotFoundError(f"Could not find {src_path}")

    orig_dest = os.path.join(OUT_DIR, "leesplankje_original.jpg")
    if os.path.abspath(src_path) != os.path.abspath(orig_dest):
        shutil.copy2(src_path, orig_dest)

    img = Image.open(src_path).convert("RGB")

    # Save clean full Leesplankje board (without the packaging box at bottom)
    board_crop = img.crop((0, 12, 1200, 865))
    board_crop.save(os.path.join(OUT_DIR, "leesplankje_board.png"), format="PNG")
    board_crop.save(os.path.join(OUT_DIR, "leesplankje_board.jpg"), format="JPEG", quality=90)

    # Create visual contact sheet
    sheet = Image.new("RGB", (1200, 640), (15, 23, 42))
    draw = ImageDraw.Draw(sheet)

    ts_entries = {}

    for idx, (word, box, label_nl, label_en) in enumerate(FIGURE_SPECS):
        cropped = img.crop(box)
        w, h = cropped.size

        png_path = os.path.join(OUT_DIR, f"{word}.png")
        jpg_path = os.path.join(OUT_DIR, f"{word}.jpg")
        cropped.save(png_path, format="PNG")
        cropped.save(jpg_path, format="JPEG", quality=88)

        # Create compact JPEG data URI for zero-latency inline SVG <image> rendering & standalone HTML export
        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=82, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode("ascii")
        data_uri = f"data:image/jpeg;base64,{b64}"

        ts_entries[word] = {
            "word": word,
            "index": idx + 1,
            "fileUrl": f"/aapnootmies/{word}.png",
            "jpgUrl": f"/aapnootmies/{word}.jpg",
            "dataUri": data_uri,
            "width": w,
            "height": h,
            "aspectRatio": round(w / h, 3),
            "isLandscape": w > h * 1.3,
            "labelNL": label_nl,
            "labelEN": label_en,
        }

        # Paste onto contact sheet
        col = idx % 6
        row = idx // 6
        x0 = 16 + col * 195
        y0 = 16 + row * 206
        disp = cropped.resize((184, int(h * 184 / w))) if w > 184 else cropped
        sheet.paste(disp, (x0, y0))
        draw.rectangle(
            [x0 - 2, y0 - 2, x0 + disp.width + 2, y0 + disp.height + 2],
            outline=(243, 198, 99),
            width=2,
        )
        draw.text((x0 + 4, y0 + disp.height + 5), f"{idx + 1}. {word} ({w}x{h})", fill=(241, 245, 249))

    sheet.save(os.path.join(OUT_DIR, "contact_sheet.png"), format="PNG")

    # Write TypeScript asset module
    ts_code = """// ============================================================================
// AUTO-GENERATED BY scripts/slice_aapnootmies.py
// 17 Cut-Out Classic Dutch "Aap Noot Mies" (Leesplankje) Figure Assets
// ============================================================================

export interface AapNootMiesFigureAsset {
  word: string;
  index: number;
  fileUrl: string;
  jpgUrl: string;
  dataUri: string;
  width: number;
  height: number;
  aspectRatio: number;
  isLandscape: boolean;
  labelNL: string;
  labelEN: string;
}

export const AAP_NOOT_MIES_FIGURES: Record<string, AapNootMiesFigureAsset> = """ + json.dumps(ts_entries, indent=2) + """;
"""
    with open(TS_OUT_FILE, "w", encoding="utf-8") as f:
        f.write(ts_code)

    print(f"Successfully sliced {len(FIGURE_SPECS)} figures into {OUT_DIR}/ and generated {TS_OUT_FILE}")


if __name__ == "__main__":
    main()

