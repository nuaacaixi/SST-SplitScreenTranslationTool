from PIL import Image, ImageDraw, ImageFont
import os

ASSETS = "assets"
os.makedirs(ASSETS, exist_ok=True)

BLUE_TOP = (0x5B, 0x9B, 0xD5)
BLUE_BOT = (0x34, 0x70, 0xA8)
TEAL_TOP = (0x4D, 0xB8, 0xB0)
TEAL_BOT = (0x2D, 0x8A, 0x83)

def make_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = max(1, round(size * 0.06))
    r = round(size * 0.18)
    x, y = pad, pad
    iw, ih = size - pad * 2, size - pad * 2
    mid = x + iw // 2
    div_w = max(1, round(size * 0.025))

    # left half blue gradient
    for row in range(y, y + ih):
        t = (row - y) / ih
        rc = int(BLUE_TOP[0] + (BLUE_BOT[0] - BLUE_TOP[0]) * t)
        gc = int(BLUE_TOP[1] + (BLUE_BOT[1] - BLUE_TOP[1]) * t)
        bc = int(BLUE_TOP[2] + (BLUE_BOT[2] - BLUE_TOP[2]) * t)
        for col in range(x, mid):
            draw.point((col, row), fill=(rc, gc, bc, 255))

    # right half teal gradient
    for row in range(y, y + ih):
        t = (row - y) / ih
        rc = int(TEAL_TOP[0] + (TEAL_BOT[0] - TEAL_TOP[0]) * t)
        gc = int(TEAL_TOP[1] + (TEAL_BOT[1] - TEAL_TOP[1]) * t)
        bc = int(TEAL_TOP[2] + (TEAL_BOT[2] - TEAL_TOP[2]) * t)
        for col in range(mid, x + iw):
            draw.point((col, row), fill=(rc, gc, bc, 255))

    # white divider
    for row in range(y + int(ih * 0.15), y + int(ih * 0.85)):
        for col in range(mid - div_w // 2, mid - div_w // 2 + div_w):
            draw.point((col, row), fill=(255, 255, 255, 255))

    # rounded corners - make pixels outside corner radius transparent
    for row in range(size):
        for col in range(size):
            px, py = col, row
            inside = True
            # top-left
            if px < x + r and py < y + r:
                dx, dy = x + r - px, y + r - py
                if dx * dx + dy * dy > r * r:
                    inside = False
            # top-right
            if px >= x + iw - r and py < y + r:
                dx, dy = px - (x + iw - r), y + r - py
                if dx * dx + dy * dy > r * r:
                    inside = False
            # bottom-left
            if px < x + r and py >= y + ih - r:
                dx, dy = x + r - px, py - (y + ih - r)
                if dx * dx + dy * dy > r * r:
                    inside = False
            # bottom-right
            if px >= x + iw - r and py >= y + ih - r:
                dx, dy = px - (x + iw - r), py - (y + ih - r)
                if dx * dx + dy * dy > r * r:
                    inside = False
            if not inside:
                draw.point((col, row), fill=(0, 0, 0, 0))

    # Text for 48px+
    if size >= 48:
        try:
            font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", round(size * 0.22))
        except Exception:
            try:
                font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", round(size * 0.22))
            except Exception:
                font = ImageFont.load_default()

        # "A" on left
        bbox = draw.textbbox((0, 0), "A", font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = x + iw * 0.25 - tw / 2
        ty = y + ih * 0.5 - th / 2 + size * 0.008
        draw.text((tx, ty), "A", fill=(255, 255, 255, 255), font=font)

        # "文" on right
        bbox = draw.textbbox((0, 0), "文", font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = x + iw * 0.75 - tw / 2
        ty = y + ih * 0.5 - th / 2 + size * 0.008
        draw.text((tx, ty), "文", fill=(255, 255, 255, 255), font=font)

    # exchange arrows for 128px
    if size >= 128:
        try:
            arrow_font = ImageFont.truetype("C:/Windows/Fonts/segoeui.ttf", round(size * 0.08))
        except Exception:
            arrow_font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), "⇄", font=arrow_font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = x + iw * 0.5 - tw / 2
        ty = y + ih * 0.86 - th / 2
        draw.text((tx, ty), "⇄", fill=(255, 255, 255, 180), font=arrow_font)

    path = os.path.join(ASSETS, f"icon{size}.png")
    img.save(path)
    print(f"  Saved {path} ({size}x{size})")

make_icon(16)
make_icon(48)
make_icon(128)
print("Done!")
