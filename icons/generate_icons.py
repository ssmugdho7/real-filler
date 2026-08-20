#!/usr/bin/env python3
"""Generate Real Filler extension icons at 16, 48, and 128px sizes."""

from PIL import Image, ImageDraw
import os

ICON_DIR = os.path.dirname(os.path.abspath(__file__))
SIZES = [128, 48, 16]
BLUE = (26, 115, 232)       # #1a73e8
WHITE = (255, 255, 255)
GRAY = (200, 200, 200)
DARK_BLUE = (20, 90, 185)


def draw_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    s = size  # shorthand
    r = s // 6  # corner radius

    # --- Blue rounded background ---
    draw.rounded_rectangle([0, 0, s - 1, s - 1], radius=r, fill=BLUE)

    # --- White document (with folded corner) ---
    margin = int(s * 0.18)
    doc_left = margin
    doc_top = int(s * 0.12)
    doc_right = s - int(s * 0.22)
    doc_bottom = s - margin
    fold = int(s * 0.14)

    # Document body (with cut corner)
    doc_polygon = [
        (doc_left, doc_top),
        (doc_right - fold, doc_top),
        (doc_right, doc_top + fold),
        (doc_right, doc_bottom),
        (doc_left, doc_bottom),
    ]
    draw.polygon(doc_polygon, fill=WHITE)

    # Fold triangle
    fold_polygon = [
        (doc_right - fold, doc_top),
        (doc_right, doc_top + fold),
        (doc_right - fold, doc_top + fold),
    ]
    draw.polygon(fold_polygon, fill=GRAY)

    # --- Form lines on document ---
    line_color = (220, 220, 220)
    line_left = doc_left + int(s * 0.08)
    line_right = doc_right - int(s * 0.08)
    line_h = max(1, s // 48)
    num_lines = 3
    line_area_top = doc_top + fold + int(s * 0.06)
    line_area_bottom = doc_bottom - int(s * 0.1)
    spacing = (line_area_bottom - line_area_top) // (num_lines + 1)

    for i in range(1, num_lines + 1):
        y = line_area_top + spacing * i
        draw.rectangle([line_left, y, line_right, y + line_h], fill=line_color)

    # --- Pencil in bottom-right corner ---
    pencil_len = int(s * 0.32)
    pencil_w = max(2, int(s * 0.05))
    tip = max(1, int(s * 0.04))

    # Pencil center point
    cx = s - int(s * 0.14)
    cy = s - int(s * 0.14)

    # Pencil angle: 45 degrees (bottom-right to top-left direction)
    import math
    angle = math.radians(225)  # pointing toward top-left
    dx = math.cos(angle)
    dy = math.sin(angle)

    # Pencil tail (back end)
    tail_x = cx - dx * pencil_len
    tail_y = cy - dy * pencil_len

    # Perpendicular for width
    px = -dy
    py = dx

    # Pencil body polygon
    body_polygon = [
        (cx + px * pencil_w, cy + py * pencil_w),
        (cx - px * pencil_w, cy - py * pencil_w),
        (tail_x - px * pencil_w, tail_y - py * pencil_w),
        (tail_x + px * pencil_w, tail_y + py * pencil_w),
    ]
    draw.polygon(body_polygon, fill=DARK_BLUE)

    # Pencil tip (triangle)
    tip_x = cx + dx * tip
    tip_y = cy + dy * tip
    tip_polygon = [
        (cx + px * pencil_w, cy + py * pencil_w),
        (cx - px * pencil_w, cy - py * pencil_w),
        (tip_x, tip_y),
    ]
    draw.polygon(tip_polygon, fill=(60, 60, 60))

    # Pencil eraser band (small rectangle at tail)
    band_w = int(pencil_len * 0.15)
    band_start_x = tail_x + dx * band_w
    band_start_y = tail_y + dy * band_w
    band_polygon = [
        (tail_x + px * pencil_w, tail_y + py * pencil_w),
        (tail_x - px * pencil_w, tail_y - py * pencil_w),
        (band_start_x - px * pencil_w, band_start_y - py * pencil_w),
        (band_start_x + px * pencil_w, band_start_y + py * pencil_w),
    ]
    draw.polygon(band_polygon, fill=(230, 230, 230))

    return img


def main():
    base = draw_icon(128)
    base.save(os.path.join(ICON_DIR, "icon128.png"), "PNG")

    base_48 = base.resize((48, 48), Image.LANCZOS)
    base_48.save(os.path.join(ICON_DIR, "icon48.png"), "PNG")

    base_16 = base.resize((16, 16), Image.LANCZOS)
    base_16.save(os.path.join(ICON_DIR, "icon16.png"), "PNG")

    print("Generated: icon128.png, icon48.png, icon16.png")


if __name__ == "__main__":
    main()
