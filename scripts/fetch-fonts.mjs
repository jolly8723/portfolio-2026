/**
 * Pre-build step: pulls the Lekta font files from a private GitHub repo into public/fonts,
 * because the fonts are deliberately kept out of this public repo (see README).
 *
 * Runs automatically before `npm run build` (the "prebuild" script).
 *  - Locally: does nothing if the fonts are already in public/fonts.
 *  - On Vercel: needs FONTS_TOKEN (a fine-grained GitHub token with read-only
 *    "Contents" access to the fonts repo). Fails the build if fonts can't be fetched,
 *    so a deploy never silently ships without them (set FONTS_OPTIONAL=1 to allow it).
 *
 * Env:
 *   FONTS_TOKEN     GitHub token (required when fonts are missing)
 *   FONTS_REPO      owner/name of the private repo   (default: jolly8723/portfolio-fonts)
 *   FONTS_REF       branch or tag                    (default: main)
 *   FONTS_REPO_DIR  folder inside that repo          (default: repo root)
 *   FONTS_DIR       where to write locally           (default: public/fonts)
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REQUIRED = ['Regular', 'Medium', 'SemiBold', 'Bold'].map((w) => `Lekta-${w}.woff2`);
const WANTED = /^Lekta-[A-Za-z]+\.(woff2|otf)$/;

const {
  FONTS_TOKEN,
  FONTS_REPO = 'jolly8723/portfolio-fonts',
  FONTS_REF = 'main',
  FONTS_REPO_DIR = '',
  FONTS_DIR = 'public/fonts',
  FONTS_OPTIONAL,
  VERCEL,
} = process.env;

const missing = () => REQUIRED.filter((f) => !existsSync(path.join(FONTS_DIR, f)));

function bail(message) {
  const strict = VERCEL && !FONTS_OPTIONAL;
  console[strict ? 'error' : 'warn'](`[fonts] ${message}`);
  if (strict) {
    console.error('[fonts] Failing the build so it does not ship without fonts (set FONTS_OPTIONAL=1 to allow).');
    process.exit(1);
  }
  console.warn('[fonts] Continuing; the site will fall back to a system font.');
  process.exit(0);
}

async function gh(url, accept) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${FONTS_TOKEN}`,
      Accept: accept,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'portfolio-fetch-fonts',
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res;
}

async function main() {
  if (missing().length === 0) {
    console.log('[fonts] Lekta fonts already present, skipping download.');
    return;
  }
  if (!FONTS_TOKEN) bail(`Fonts missing (${missing().join(', ')}) and FONTS_TOKEN is not set.`);

  const api = `https://api.github.com/repos/${FONTS_REPO}/contents`;
  const dir = FONTS_REPO_DIR.replace(/^\/|\/$/g, '');
  let listing;
  try {
    const listUrl = `${api}${dir ? `/${dir}` : ''}?ref=${encodeURIComponent(FONTS_REF)}`;
    listing = await (await gh(listUrl, 'application/vnd.github+json')).json();
  } catch (err) {
    bail(`Could not list ${FONTS_REPO}: ${err.message}. Check the token's repo access and the repo name.`);
  }

  const files = (Array.isArray(listing) ? listing : []).filter((f) => f.type === 'file' && WANTED.test(f.name));
  if (files.length === 0) bail(`No Lekta-*.woff2/otf files found in ${FONTS_REPO}/${dir || '(root)'}.`);

  await mkdir(FONTS_DIR, { recursive: true });
  for (const file of files) {
    const res = await gh(`${api}/${file.path}?ref=${encodeURIComponent(FONTS_REF)}`, 'application/vnd.github.raw');
    await writeFile(path.join(FONTS_DIR, file.name), Buffer.from(await res.arrayBuffer()));
    console.log(`[fonts] fetched ${file.name}`);
  }

  if (missing().length) bail(`Still missing after download: ${missing().join(', ')}.`);
  console.log(`[fonts] ${files.length} font files ready in ${FONTS_DIR}.`);
}

main().catch((err) => bail(err.message));
