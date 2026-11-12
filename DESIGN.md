# Design system: Jewel box

Chosen by the owner on 2026-11-12. Read this before building or changing any screen.

## The idea

The shop is the lining of a jewellery box. One deep green (the logo's green) covers every shop
page; gold marks what you can act on; the stones and photographs are the only other colour.
Admin screens use the same parts on a light desk, because long data work reads better on light.

## Tokens (`frontend/src/styles/index.css`)

Never write a colour or font in a component. Use these Tailwind names; they switch by themselves
between the shop (dark) and admin (`data-theme="light"` on the admin shell).

| Class name | Job | Shop | Admin |
|---|---|---|---|
| `ground` | page background | `#0a2b22` | `#f3f2ee` |
| `raised` | panels, cards, bands | `#0e3b2e` | `#fbfaf7` |
| `field` | inputs, the stone band | `#07201a` | `#ffffff` |
| `ink` | main text | `#f1ead8` | `#12261f` |
| `muted` | secondary text | `#a9b8ab` | `#55665d` |
| `line` | borders, dividers | `#34604f` | `#cfd2c9` |
| `action` / `on-action` | primary button and its text | gold / green | green / linen |
| `gold` | links, focus rings, hairlines | `#e8cd7f` | `#7a5c10` |
| `danger` | errors, destructive actions | `#ffb4a8` | `#a3261e` |

Fixed colours `brand-forest-950`, `brand-linen-100`, `brand-gold-300` are only for surfaces that
stay dark everywhere: text over photos and film, and the admin top bar.

## Type

- Headings: `font-display` (Marcellus). It has one weight; never bold it, never italic.
- Everything else: Hanken Grotesk, 15 to 17px for body text.
- Labels are sentence case, never capitals with wide spacing. No small label above a heading.

## Shape and parts

- Corners are square. Only round things are round: the logo, stone swatches, spinners.
- Buttons: `Button`, or `buttonClass()` for links. `primary` (gold), `outline`, `danger`. One primary per screen.
- Fields: `Field`, `PasswordField`, `inputClass`. Always a visible label; errors sit under the field.
- Header: `SiteHeader` on every shop page (`overlay` when it sits on a photo or film).
- Photos get a 1px `line` border that turns `gold` on hover. Images do not move on hover.
- Gold hairlines (`border-gold/40`) separate big bands: under the header, around the stone band.

## Motion

- The page never scrolls for the visitor. Film plays in place (`FilmClip`), once, with a pause button.
- Everything respects "reduce motion": stills instead of film, no reveal animation.
- Animate only opacity and transform.

## Copy rules

- State only facts the owner has confirmed (see `OWNER_QUESTIONS.md`). No invented numbers,
  reviews, purity or origin claims.
- Buttons say what they do ("Shop the collection"). No arrows or dots joining words.

## Still to replace

- Photos and film show gold-coloured pieces; the brand is silver. Swap when real photos arrive.
- "Our promise" wording is provisional until the owner confirms it.
