# Daily workout scheduler

A small web app that builds a **session from your constraints**: workout focus (upper body, arms, legs, total body, core), home or gym, time budget, load style (bodyweight, weights, or both), and equipment. It always adds a **short warm-up**, lists **main exercises** with **reps or timed holds**, **RPE targets**, and optional **collapsible YouTube form videos**.

## Requirements

- [Node.js](https://nodejs.org/) 18+ (20 LTS recommended)
- npm (comes with Node)

## Install

Clone the repo, then install dependencies:

```bash
cd daily-workout-scheduler
npm install
```

## Run locally (development)

Start the Vite dev server with hot reload:

```bash
npm run dev
```

Open the URL shown in the terminal (usually **http://localhost:5173**).

## Build for production

Typecheck and emit static files into `dist/`:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

Then open the URL Vite prints (often **http://localhost:4173**).

### Matching GitHub Pages asset paths locally

Project sites are served from `https://<user>.github.io/<repo>/`. The build sets `base` automatically in CI. To preview that layout on your machine:

```bash
CI=true GITHUB_REPOSITORY=<your-username>/<your-repo-name> npm run build
npm run preview
```

## Access on GitHub Pages

If the repo is wired for GitHub Actions deploy:

1. **GitHub → Settings → Pages** → **Build and deployment** → set **Source** to **GitHub Actions**.
2. Push to `main` (or `master`). Check the **Actions** tab for **Deploy to GitHub Pages**.
3. When the workflow succeeds, open the site URL from the workflow run or the Pages settings.

Typical URL for a project repository:

`https://<your-username>.github.io/<repository-name>/`

## Project layout

| Path | Purpose |
|------|---------|
| `src/main.ts` | UI and form |
| `src/scheduler.ts` | Filtering exercises, time budget, RPE |
| `src/exerciseBank.ts` | Exercise definitions |
| `src/exerciseVideos.ts` | YouTube links keyed by exercise id |
| `src/warmup.ts` | Warm-up block copy |
| `src/types.ts` | Shared types |
| `.github/workflows/deploy-pages.yml` | Build and deploy `dist` to GitHub Pages |

## License

This project is provided as-is for personal use; add a license file if you redistribute it.
