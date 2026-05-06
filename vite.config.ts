import { defineConfig } from 'vite';

/**
 * GitHub Pages project site: https://<user>.github.io/<repo>/
 * - In GitHub Actions, GITHUB_REPOSITORY is set and we use /<repo>/.
 * - User/org site (repo named <user>.github.io): base stays /.
 * Override anytime: VITE_BASE_PATH=/my-repo/
 */
function pagesBase(): string {
  const override = process.env.VITE_BASE_PATH?.trim();
  if (override) {
    const p = override.startsWith('/') ? override : `/${override}`;
    return p.endsWith('/') ? p : `${p}/`;
  }
  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (process.env.CI && repo) {
    if (repo.endsWith('.github.io')) return '/';
    return `/${repo}/`;
  }
  return '/';
}

export default defineConfig({
  root: '.',
  base: pagesBase(),
  build: {
    outDir: 'dist',
  },
});
