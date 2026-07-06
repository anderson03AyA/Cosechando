from PIL import Image, ImageChops, ImageDraw, ImageFilter

SIZE = 1024
UPSCALE = 4
CANVAS = SIZE * UPSCALE
CENTER = CANVAS // 2

CREAM = "#F5E6C8"
CREAM_LIGHT = "#FBF3E3"
GREEN = "#2E7D32"
GREEN_DARK = "#205B25"
GOLD = "#E3B23C"
BROWN = "#8E5A2B"
GRAY = "#8E8E8E"
TRANSPARENT = (0, 0, 0, 0)


def downsample(image: Image.Image) -> Image.Image:
    return image.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def ellipse_mask(box):
    mask = Image.new("L", (CANVAS, CANVAS), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse(box, fill=255)
    return mask


def rounded_rect_mask(box, radius):
    mask = Image.new("L", (CANVAS, CANVAS), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(box, radius=radius, fill=255)
    return mask


def polygon_mask(points):
    mask = Image.new("L", (CANVAS, CANVAS), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(points, fill=255)
    return mask


def add_shadow(base, mask, offset, blur, color):
    shadow = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    shadow.paste(color, offset, mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(shadow)


def add_vertical_gradient(base, mask, top_color, bottom_color):
    gradient = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    pixels = gradient.load()
    top = tuple(int(top_color[i:i+2], 16) for i in (1, 3, 5))
    bottom = tuple(int(bottom_color[i:i+2], 16) for i in (1, 3, 5))
    for y in range(CANVAS):
        t = y / max(CANVAS - 1, 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3)) + (255,)
        for x in range(CANVAS):
            pixels[x, y] = color
    gradient.putalpha(mask)
    base.alpha_composite(gradient)


def draw_leaf(base, center_x, center_y, width, height, color, angle=0):
    layer = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    draw = ImageDraw.Draw(layer)
    box = (
        center_x - width // 2,
        center_y - height // 2,
        center_x + width // 2,
        center_y + height // 2,
    )
    draw.ellipse(box, fill=color)
    cut = Image.new("L", (CANVAS, CANVAS), 0)
    cut_draw = ImageDraw.Draw(cut)
    cut_draw.polygon(
        [
            (center_x, center_y - height // 2),
            (center_x + width // 2, center_y),
            (center_x, center_y + height // 2),
            (center_x - width // 8, center_y),
        ],
        fill=255,
    )
    layer.putalpha(ImageChops.multiply(layer.getchannel("A"), cut))
    rotated = layer.rotate(angle, resample=Image.Resampling.BICUBIC, center=(center_x, center_y))
    base.alpha_composite(rotated)


def build_foreground(monochrome=False):
    base = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    primary = GRAY if monochrome else GREEN
    secondary = GRAY if monochrome else GREEN_DARK
    accent = GRAY if monochrome else GOLD
    basket = GRAY if monochrome else BROWN

    bowl_box = (220 * UPSCALE, 590 * UPSCALE, 804 * UPSCALE, 790 * UPSCALE)
    bowl_mask = rounded_rect_mask(bowl_box, 78 * UPSCALE)
    add_shadow(base, bowl_mask, (0, 18 * UPSCALE), 20 * UPSCALE, (0, 0, 0, 70 if not monochrome else 0))
    add_vertical_gradient(base, bowl_mask, accent if monochrome else "#C98E2C", basket)

    lip_box = (252 * UPSCALE, 560 * UPSCALE, 772 * UPSCALE, 630 * UPSCALE)
    lip_mask = rounded_rect_mask(lip_box, 34 * UPSCALE)
    add_vertical_gradient(base, lip_mask, accent, accent if monochrome else "#C99228")

    draw_leaf(base, 392 * UPSCALE, 418 * UPSCALE, 180 * UPSCALE, 332 * UPSCALE, primary, angle=-28)
    draw_leaf(base, 632 * UPSCALE, 418 * UPSCALE, 180 * UPSCALE, 332 * UPSCALE, primary, angle=28)
    draw_leaf(base, 512 * UPSCALE, 336 * UPSCALE, 174 * UPSCALE, 392 * UPSCALE, secondary, angle=0)

    stem = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    stem_draw = ImageDraw.Draw(stem)
    stem_draw.rounded_rectangle(
        (494 * UPSCALE, 432 * UPSCALE, 530 * UPSCALE, 618 * UPSCALE),
        radius=16 * UPSCALE,
        fill=secondary,
    )
    if not monochrome:
        stem = stem.filter(ImageFilter.GaussianBlur(0.8 * UPSCALE))
    base.alpha_composite(stem)

    highlight = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    highlight_draw = ImageDraw.Draw(highlight)
    highlight_draw.arc(
        (278 * UPSCALE, 598 * UPSCALE, 744 * UPSCALE, 790 * UPSCALE),
        start=200,
        end=340,
        fill=(255, 255, 255, 110 if not monochrome else 0),
        width=16 * UPSCALE,
    )
    base.alpha_composite(highlight)
    return base


def build_icon():
    base = Image.new("RGBA", (CANVAS, CANVAS), CREAM)

    sun = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    sun_draw = ImageDraw.Draw(sun)
    sun_draw.ellipse(
        (188 * UPSCALE, 150 * UPSCALE, 836 * UPSCALE, 798 * UPSCALE),
        fill=CREAM_LIGHT,
    )
    sun = sun.filter(ImageFilter.GaussianBlur(12 * UPSCALE))
    base.alpha_composite(sun)

    badge_mask = rounded_rect_mask(
        (116 * UPSCALE, 116 * UPSCALE, 908 * UPSCALE, 908 * UPSCALE),
        220 * UPSCALE,
    )
    badge = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    add_vertical_gradient(badge, badge_mask, "#FAF1DD", "#F0DFC0")
    add_shadow(base, badge_mask, (0, 24 * UPSCALE), 28 * UPSCALE, (70, 42, 18, 60))
    base.alpha_composite(badge)

    fg = build_foreground(monochrome=False)
    base.alpha_composite(fg)
    return downsample(base)


def build_background():
    bg = Image.new("RGBA", (CANVAS, CANVAS), CREAM)
    halo = Image.new("RGBA", (CANVAS, CANVAS), TRANSPARENT)
    halo_draw = ImageDraw.Draw(halo)
    halo_draw.ellipse(
        (184 * UPSCALE, 170 * UPSCALE, 840 * UPSCALE, 826 * UPSCALE),
        fill="#FAF1DD",
    )
    halo = halo.filter(ImageFilter.GaussianBlur(18 * UPSCALE))
    bg.alpha_composite(halo)
    return downsample(bg)


def build_foreground_png():
    return downsample(build_foreground(monochrome=False))


def build_monochrome():
    return downsample(build_foreground(monochrome=True))


def build_favicon():
    return build_icon().resize((48, 48), Image.Resampling.LANCZOS)


def main():
    build_icon().save("assets/images/icon.png")
    build_background().save("assets/images/android-icon-background.png")
    build_foreground_png().save("assets/images/android-icon-foreground.png")
    build_monochrome().save("assets/images/android-icon-monochrome.png")
    build_favicon().save("assets/images/favicon.png")


if __name__ == "__main__":
    main()
