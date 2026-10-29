import 'dotenv/config';

function required(name, fallback) {
  const value = (process.env[name] ?? fallback ?? '').trim();
  if (!value) {
    console.error(`[config] Variable manquante : ${name}. Copie .env.example vers .env et remplis-la.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  token: required('DISCORD_TOKEN'),
  competitionId: required('COMPETITION_ID'),
  baseUrl: (process.env.ARENA_BASE_URL ?? 'https://hsg.yogosha.com').replace(/\/+$/, ''),
  cacheTtl: Number(process.env.CACHE_TTL_SECONDS ?? 30) * 1000,
  guildId: (process.env.GUILD_ID ?? '').trim() || null,
};

if (!Number.isFinite(config.cacheTtl) || config.cacheTtl < 0) {
  console.error('[config] CACHE_TTL_SECONDS doit être un nombre positif.');
  process.exit(1);
}
