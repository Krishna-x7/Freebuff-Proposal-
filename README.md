# Reasons why you should date me

A tiny one-page scroll story. No build step, no dependencies — just open `index.html`.

## Put your doodles in

Each screen tries three files in order, so any one of them works:

| screen                                | 1st       | 2nd       | 3rd (built-in) |
| ------------------------------------- | --------- | --------- | -------------- |
| first screen                          | `1.svg`   | `1.jpg`   | `art/1.svg`    |
| "oh so you're interested" screen      | `2.svg`   | `2.jpg`   | `art/2.svg`    |
| reason 1 (the 3 am cooking one)       | `3.svg`   | `3.jpg`   | `art/3.svg`    |
| reason 2 (the cleaning one)           | `4.svg`   | `4.jpg`   | `art/4.svg`    |
| reason 3 (the never-cheat one)        | `5.svg`   | `5.jpg`   | `art/5.svg`    |
| reason 4 (the unlimited flowers one)  | `6.svg`   | `6.jpg`   | `art/6.svg`    |

Put any of those in the project root and it is picked up automatically — no code changes.
Until a file exists, the hand-drawn `art/N.svg` stand-in is shown, so the page never looks broken.

## Previewing locally

```bash
python3 serve.py 3000
```

It serves the folder on port 3000 with `no-store` headers, so a refresh always shows the
current files, and it exposes `/__build` so an open preview reloads itself when a file changes.
(`index.html` also opens fine directly, just without live reload.)

## Files

- `index.html` — the seven screens and their copy
- `styles.css` — paper-and-doodle look, scroll snapping, reveal animations
- `script.js` — word-by-word reveals, parallax cards, page dots, heart burst
- `art/` — fallback doodles
- `serve.py` — no-cache dev server with live reload

## The final question

The last screen asks "So what do you say" with **Yes** / **No** buttons.

- **Yes** — confetti poppers fire from both corners, hearts float up, and the page says something smug.
- **No** — rain runs down the screen and the page goes a bit grey and wet-looking.

Both effects replay if you click again. The click can only play sound once it has happened,
which is why it is wired to the buttons and not on scroll.

### Sound effects

Each choice tries two sources, in this order:

1. `popper.mp3` (Yes) or `cry.mp3` (No) next to `index.html` — drop one in and it is used.
2. Otherwise the YouTube clip is embedded in a hidden 1px iframe and autoplayed:
   - Yes: <https://youtu.be/8SoovMIylmA>
   - No: <https://youtube.com/shorts/D32vImPoMZs>

The YouTube route needs an internet connection, and a browser with a strict autoplay policy
may still refuse it. If the sound does not play, save the audio as `popper.mp3` / `cry.mp3`
in this folder — that always works, including offline.

## Notes

- Scroll snapping is on, so each screen locks into place.
- Arrow keys / PageUp / PageDown also move between screens; the dots on the right jump anywhere.
- `prefers-reduced-motion` turns the effects and animations off (the notes still appear).
- Display font is Gaegu from Google Fonts, with a handwriting fallback if it can't load.
