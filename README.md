# ColorSwitchWeb

A browser-based Color Switch game served from the `public` directory with Express.

## Run locally

```bash
npm install
npm start
```

Then open:

```text
http://localhost:3123
```

To use a different port:

```bash
PORT=8080 npm start
```

## Project layout

- `server.js` serves the static app.
- `public/` contains the browser game, editor, styles, and level data.
- `scripts/adapt-java-levels.mjs` converts levels from the original Java project format.

## Checks

```bash
npm run check
```
