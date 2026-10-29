import 'dotenv/config';

function fail(message) {
  console.error(`[config] ${message}`);
  process.exit(1);
}

function required(name) {
  const value = (process.env[name] ?? '').trim();
  if (!value) fail(`Variable manquante : ${name}. Copie .env.example vers .env et remplis-la.`);
  return value;
}

/** Aucune valeur par défaut : chaque utilisateur fournit sa propre compétition. */
function readCompetitionId() {
  const value = (process.env.COMPETITION_ID ?? '').trim();

  if (!value) {
    fail(
      'COMPETITION_ID manquant. Ouvre la page de la compétition à suivre et copie le\n' +
        '         dernier segment de son URL : https://hsg.yogosha.com/public/competitions/<ID>',
    );
  }

  // Un ID est un segment d'URL opaque : ni espace, ni slash, ni protocole.
  if (!/^[A-Za-z0-9_-]{6,64}$/.test(value)) {
    fail(
      `COMPETITION_ID invalide : « ${value} ».\n` +
        '         Attendu : le dernier segment de https://hsg.yogosha.com/public/competitions/<ID>',
    );
  }

  return value;
}

export const config = {
  token: required('DISCORD_TOKEN'),
  competitionId: readCompetitionId(),
  baseUrl: (process.env.ARENA_BASE_URL ?? 'https://hsg.yogosha.com').replace(/\/+$/, ''),
  cacheTtl: Number(process.env.CACHE_TTL_SECONDS ?? 30) * 1000,
  guildId: (process.env.GUILD_ID ?? '').trim() || null,
};

if (!Number.isFinite(config.cacheTtl) || config.cacheTtl < 0) {
  fail('CACHE_TTL_SECONDS doit être un nombre positif.');
}
