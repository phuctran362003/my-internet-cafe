# Art prompts — cafe-pixel-v1

Dùng chung cho mọi lần gọi image generator. Không đổi style id, palette, kích thước, hay thứ tự frame.

Luôn dán block này vào đầu prompt:

```text
Style id cafe-pixel-v1. 2D top-down pixel art for a modest Vietnamese internet cafe tycoon. Native 64x64 pixels per cell, one design pixel per tile pixel, camera zooms by whole numbers. One-pixel dark outline #1b1420 on sprites only. Flat colors only from the closed palette, no gradients, no anti-aliasing, no blur, no text, no emoji, no watermark. Transparent background outside the sprite. Match the existing spritesheet: same palette, same top-down proportion, more interior detail (hair shine, eyes, screen reflection, brick courses). Do not invent a new style.
```

Palette nhắc lại trong prompt khi cần: wood `#c4a574`, wall `#4d596b`, skin `#f0c29a`, desk `#5c4030`, bezel `#232833`, screen glow tokens `#2f8f78` `#3d9ed6` `#7ee0c8` `#68b7ff` `#e6c15a`.

## Environment

```text
[STYLE BLOCK]
A tileset row, 10 tiles of 64x64 with no gaps: wood floor, alternate wood floor, brick wall, open wooden door, closed wooden door, wall window with four panes, cafe counter, storage floor with a crate, pale toilet tile, small red rug. Top-down. Consistent plank width and brick size across tiles.
```

## Characters

```text
[STYLE BLOCK]
One character row on a transparent spritesheet, 9 frames of 64x64 in this order: face down idle, face down walk, face left idle, face left walk, face right idle, face right walk, face up idle, face up walk, sitting at a computer facing down. Chibi top-down proportions, big head, small body, feet near the bottom of the cell. Same silhouette for every customer. Only hair and shirt colors change per variant.
Variants follow CHARACTER_VARIANTS row order (multiple looks per archetype: student/gamer/office/regular/troublemaker/wealthy, then guard). Same silhouette; hair cut, hair color, and shirt color change per look.
```

## Computers

```text
[STYLE BLOCK]
Computer spritesheet, 5 rows by 4 columns, each cell 64x64. Rows are basic, standard, gaming, high-end, premium. Columns are available (screen off #1e3a4c), occupied (screen on using that tier color), broken (screen #c4503c), maintenance (screen #d0a04a). Top-down wooden desk, dark bezel, keyboard at the bottom. Same desk silhouette on every frame.
```

## Furniture

```text
[STYLE BLOCK]
Three 64x64 furniture sprites in one row: simple wooden chair top-down, potted plant with two green tones #3e8f62 and #246043 in a red pot #8c3d4a, small counter segment. Same outline and wood colors as the cafe tileset.
```

## Items

```text
[STYLE BLOCK]
Four 64x64 item icons in one row, centered, lots of transparent padding: bottled drink #3d6fbf, noodle cup #e0a23a, white medicine box with a red mark, red food pack. Same outline #1b1420. No labels.
```

## UI

```text
[STYLE BLOCK]
Three 64x64 bust portraits in one row, facing camera, same face construction: adult player black hair blue shirt, wife pink hair red shirt, child brown hair green shirt. Flat pixel face, two eyes, no background.
```

## Effects

```text
[STYLE BLOCK]
Three 64x64 effect icons in one row: warning triangle #e0564a with a white mark, gold coin #e0a23a, small noodle bowl. Thick outline, readable at 64 pixels, transparent background.
```

## Negative prompt dùng chung

```text
3D, painterly, anime screenshot, realistic photo, blurry, anti-aliased, smooth gradient, dramatic lighting, text, letters, watermark, emoji, isometric RPG tiles that do not match 64x64 top-down, random palette, thick black bar, cropped sprite
```
