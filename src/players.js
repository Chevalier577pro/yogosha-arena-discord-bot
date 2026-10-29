import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const PLAYERS_FILE = fileURLToPath(new URL('../data/players.json', import.meta.url));

let cached = null;

/**
 * Table de correspondance Discord -> pseudo Yogosha.
 * Format : { "123456789012345678": "pseudo_yogosha" }
 */
export async function loadPlayers() {
  if (cached) return cached;

  try {
    const raw = await readFile(PLAYERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    cached = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    cached = {};
  }

  return cached;
}
