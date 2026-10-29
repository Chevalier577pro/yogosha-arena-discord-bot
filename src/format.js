/** Utilitaires de mise en forme partagés par les commandes. */

/** Minuscule sans accents, pour comparer les pseudos. */
export function normalize(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Coupe proprement une chaîne à `max` caractères. */
export function truncate(value, max) {
  const str = String(value ?? '');
  return str.length <= max ? str : `${str.slice(0, max - 1)}…`;
}

const padRight = (value, width) => truncate(value, width).padEnd(width, ' ');
const padLeft = (value, width) => String(value).padStart(width, ' ');

/** Affiche une valeur absente comme un tiret plutôt que « undefined ». */
function show(value) {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number' && Number.isNaN(value)) return '—';
  return String(value);
}

const ESC = '\u001b[';
const RESET = `${ESC}0m`;
const paint = (text, code) => (code ? `${ESC}${code}m${text}${RESET}` : text);

/** Couleurs ANSI Discord : or, argent, bronze. */
const RANK_COLOR = { 1: '1;33', 2: '1;37', 3: '1;35' };

/**
 * Convertit une ligne de `standings` de l'API en ligne de tableau.
 * C'est le seul endroit où les noms de champs de l'API sont traduits.
 */
export function toTableRow(standing) {
  return {
    rank: standing?.rank,
    name: standing?.display_name,
    kudos: standing?.total_kudos ?? 0,
    reports: standing?.report_count ?? 0,
    accepted: standing?.accepted_count ?? 0,
    firstBloods: standing?.first_blood_count ?? 0,
  };
}

const COLUMNS = [
  { label: '#', width: 3, align: 'right', field: 'rank' },
  { label: 'JOUEUR', width: 17, align: 'left', field: 'name' },
  { label: 'KUDOS', width: 6, align: 'right', field: 'kudos' },
  { label: 'REP', width: 4, align: 'right', field: 'reports' },
  { label: 'ACC', width: 4, align: 'right', field: 'accepted' },
  { label: 'FB', width: 3, align: 'right', field: 'firstBloods' },
];

const renderRow = (values) =>
  values
    .map((value, i) =>
      COLUMNS[i].align === 'right' ? padLeft(show(value), COLUMNS[i].width) : padRight(show(value), COLUMNS[i].width),
    )
    .join('  ');

/**
 * Tableau monospace coloré. `rows` doit venir de `toTableRow`.
 * `highlight` met en avant un pseudo (celui de l'auteur de la commande).
 */
export function buildTable(rows, { highlight = null } = {}) {
  const header = renderRow(COLUMNS.map((column) => column.label));
  const rule = COLUMNS.map((column) => '─'.repeat(column.width)).join('  ');

  const lines = [paint(header, '1;36'), paint(rule, '0;34')];

  for (const row of rows) {
    const line = renderRow(COLUMNS.map((column) => row?.[column.field]));
    const isMe = highlight && normalize(row?.name) === normalize(highlight);
    lines.push(paint(line, isMe ? '1;32' : (RANK_COLOR[row?.rank] ?? null)));
  }

  return ['```ansi', ...lines, '```'].join('\n');
}

/** 90_000 -> "1 min 30 s" */
export function humanDuration(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days} j ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min ${seconds} s`;
  return `${seconds} s`;
}

/** Décrit une fenêtre temporelle à partir de ses bornes ISO. */
export function describeWindow(startDate, endDate) {
  const start = Date.parse(startDate);
  const end = Date.parse(endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return 'Dates inconnues';

  const unixStart = Math.floor(start / 1000);
  const unixEnd = Math.floor(end / 1000);
  const now = Date.now();

  const state =
    now < start
      ? `ouvre <t:${unixStart}:R>`
      : now > end
        ? `terminée <t:${unixEnd}:R>`
        : `ferme <t:${unixEnd}:R> (${humanDuration(end - now)})`;

  return `<t:${unixStart}:d> → <t:${unixEnd}:t> · ${state}`;
}

/** 4 / 12 -> "33 %" */
export function ratio(part, total) {
  if (!total) return '—';
  return `${Math.round((part / total) * 100)} %`;
}

/** Barre de progression facon HUD. */
export function bar(part, total, width = 12) {
  if (!total) return '▱'.repeat(width);
  const filled = Math.round((Math.min(part, total) / total) * width);
  return '▰'.repeat(filled) + '▱'.repeat(width - filled);
}

/** Barre tronquée : max 1024 caractères par cellule d'embed. */
export function fitField(value, max = 1024) {
  const str = String(value ?? '');
  return str.length <= max ? str : `${str.slice(0, max - 3)}...`;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Podium compact pour la première page du classement. */
export function podium(standings) {
  const lines = [];

  for (const rank of [1, 2, 3]) {
    const group = standings.filter((row) => row.rank === rank);
    if (group.length === 0) continue;

    const names = group.map((row) => `**${row.display_name}**`).join(' · ');
    lines.push(`${MEDALS[rank - 1]} ${names} — ${group[0].total_kudos} kudos`);
  }

  return lines.join('\n');
}
