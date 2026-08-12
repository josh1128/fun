# Mochi 🐾 — a little cat, a little question

A 3D interactive cat you can pet, feed, and play with. Fill Mochi's heart and the
golden-hour sky warms up as the cat pops a question. Built with plain
[Three.js](https://threejs.org/) — no build step, fully static.

## What's inside
- Chibi cat built from primitives, with idle breathing, blinking, ear twitches and a wagging tail
- Pet by clicking/dragging on the cat; **Pet / Feed / Play** buttons to bond
- Fill Mochi's heart and the cat leads you down a **gallery hall** of your photos
- At the end wall hangs the final photo as the sky warms and the
  **"Will you be my girlfriend?"** moment arrives
- A "Yes" that grows and a playful "No" that keeps dodging
- Real-time bloom lighting, drifting petals, opt-in purr sound
- Responsive, keyboard-focusable, respects `prefers-reduced-motion`

## Your photos
The framed pictures live in `photos/` as `memory1.jpg` … `memory9.jpg`.
`memory8.jpg` is the large photo on the final wall. To swap any of them,
replace the file with your own (keep the same name). If a new photo has a very
different shape, update its `aspect` (width / height) in the `MEMORIES` array
near the top of `main.js` so the frame fits it.

## Run locally
It's a static site, so any static server works:

```bash
# Python
python3 -m http.server 5173
# or Node
npx serve .
```

Then open http://localhost:5173. (Opening `index.html` directly via `file://`
can break ES-module imports, so use a server.)

## Deploy to Vercel

This is a zero-config static site. Pick whichever is easiest:

**A. Drag & drop** — go to <https://vercel.com/new>, drop this folder in.

**B. Vercel CLI**
```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

**C. Git** — push this folder to GitHub, then "Import Project" on Vercel.
No framework preset needed — choose **Other**. Build command: none.
Output directory: `.` (root).

## Customize
- Change the cat's name: search `Mochi` in `index.html` and `main.js`.
- Change the question: edit `#askTitle` in `index.html`.
- Recolor the cat: the `FUR`, `PINK`, `CREAM` constants near the top of `main.js`.
- Sunset colors: the `skyWarm` object in `main.js`.
