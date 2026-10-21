# CHADOO on GitHub Pages

This uses the same deployment approach as the current GT-R NISMO and VERAUIT
repositories: GitHub Actions builds `dist/`, uploads a Pages artifact, and deploys it.
There is no Netlify dependency and no new application framework.

## What changed

The development server maps `/images/`, `/videos/`, and `/posters/` to `public/`.
GitHub Pages cannot perform those server rewrites, and a project site lives under
`/chadoo-website/` rather than at the domain root.

`npm run build` writes a separate `dist/` deployment copy:

- `index.html` uses relative CSS, JavaScript, image, and poster URLs.
- The generated Hero script uses relative video URLs. Its logic is unchanged.
- Original public files are copied byte-for-byte into `dist/images`, `dist/videos`,
  and `dist/posters`. Nothing is compressed, regenerated, or removed.
- `.nojekyll` marks the artifact as a plain static site.
- Hash navigation stays within the repository path. No SPA fallback is needed.

Original `index.html`, `src/`, `public/`, and the localhost server remain unchanged.
`netlify.toml` is preserved but excluded from the Pages artifact and unused.
Existing placeholder links and the empty favicon remain unchanged.
`dist/` is generated and ignored by Git. Rebuild after editing the source. The
builder does not delete files; unexpected files in `dist/` cause an explicit error.

## Local verification

Use Node.js 24 (matching the workflow). No package installation is required.

```sh
npm run build
npm run check:pages
npm run preview:pages
```

Open `http://127.0.0.1:4173/chadoo-website/`. This serves the actual artifact under
the same path shape as GitHub Pages, with no asset rewrites. Video byte ranges
are supported for scrubbing. `npm run dev` still runs the original site on port 5173.

Local verification completed at 1440, 1024, 768, 430, and 390px using Edge/Chromium
with touch emulation on mobile. All seven sections matched the original layout
and computed styles. Image decoding, desktop/mobile video selection, forward and
reverse video scrubbing, drink hover/tap, ingredient/moment scroll transitions,
city switching, hash-link reloads, and reduced motion passed. All 37 referenced
resources loaded without errors, and video byte ranges returned HTTP 206.
These are local checks; live Pages and physical iOS testing remain separate.

## Next steps in GitHub Desktop — when ready to publish

1. Open the existing `chadoo-website` repository at `D:\jiashiang\chadoo-website`.
   Use **File → Add local repository** if necessary. Stay on `main`.
2. Review the migration changes. `dist/` and `.qa/` should not appear in Changes;
   no original page, style, interaction, or media files should be changed.
3. On GitHub, open this repository's **Settings → Pages** and set **Source** to
   **GitHub Actions**. Do not choose a branch folder or Netlify.
4. In GitHub Desktop, enter a commit summary such as
   `Prepare CHADOO for GitHub Pages`, then choose **Commit to main**.
5. Choose **Push origin** only when ready. That push triggers the workflow and
   publication. Pull requests build and validate only; they do not deploy.
6. On GitHub, check **Actions → Deploy CHADOO to GitHub Pages**. Once successful,
   open the URL shown by the deployment (normally
   `https://jiashiang-dev.github.io/chadoo-website/`).

No commit, push, repository setting change, or publication is performed by the
local build or preview commands. If this repository is still connected to Netlify,
disable its automatic deployment separately before your future push if you no
longer want that service to build it. This migration does not contact Netlify.
