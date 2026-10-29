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

/**
 * Tableau monospace. `rows` = [{ rank, name, kudos, reports, accepted, firstBloods }]
 */
export function buildTable(rows) {
  const NAME = 18;
  const lines = [
    `${padLeft('#', 3)}  ${padRight('Joueur', NAME)} ${padLeft('Kudos', 6)} ${padLeft('Rap', 4)} ${padLeft('Acc', 4)} ${padLeft('FB', 3)}`,
    `${'─'.repeat(3)}  ${'─'.repeat(NAME)} ${'─'.repeat(6)} ${'─'.repeat(4)} ${'─'.repeat(4)} ${'─'.repeat(3)}`,
  ];

  for (const row of rows) {
    lines.push(
      `${padLeft(row.rank, 3)}  ${padRight(row.name, NAME)} ${padLeft(row.kudos, 6)} ${padLeft(row.reports, 4)} ${padLeft(row.accepted, 4)} ${padLeft(row.firstBloods, 3)}`,
    );
  }

  return ['```', ...lines, '```'].join('\n');
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
