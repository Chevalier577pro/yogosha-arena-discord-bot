import { config } from './config.js';

/**
 * Client minimal pour l'API publique de Yogosha Arena.
 *
 * Endpoints utilisés (publics, sans authentification) :
 *   GET /api/public/competitions/{id}
 *   GET /api/public/competitions/{id}/rounds
 *   GET /api/public/competitions/{id}/rounds/{roundId}/standings
 *   GET /api/public/competitions/{id}/hunters/{hunterId}
 */

export class ApiError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

const cache = new Map();

/** Mémoïse une promesse pendant `ttl` ms. */
function memo(key, ttl, loader) {
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < ttl) return hit.promise;

  const promise = loader().catch((error) => {
    cache.delete(key);
    throw error;
  });

  cache.set(key, { at: now, promise });
  return promise;
}

async function request(path) {
  const url = new URL(path, config.baseUrl + '/');
  let res;

  try {
    res = await fetch(url, {
      headers: {
        accept: 'application/json',
        'user-agent': 'yogosha-arena-discord-bot/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new ApiError(`Impossible de joindre ${url.host}.`, 'NETWORK');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body?.detail;
    throw new ApiError(
      typeof detail === 'string' ? detail : `L'API a répondu HTTP ${res.status}.`,
      res.status === 404 ? 'NOT_FOUND' : 'HTTP',
    );
  }

  return res.json();
}

const comp = () => config.competitionId;

export function getCompetition() {
  return memo('competition', config.cacheTtl, () => request(`/api/public/competitions/${comp()}`));
}

export function getRounds() {
  return memo('rounds', config.cacheTtl, () => request(`/api/public/competitions/${comp()}/rounds`));
}

export function getStandings(roundId) {
  return memo(`standings:${roundId}`, config.cacheTtl, () =>
    request(`/api/public/competitions/${comp()}/rounds/${roundId}/standings`),
  );
}

export function getHunter(hunterId) {
  return memo(`hunter:${hunterId}`, config.cacheTtl, () =>
    request(`/api/public/competitions/${comp()}/hunters/${hunterId}`),
  );
}

/** Choisit la manche demandée, sinon la manche en cours, sinon la dernière. */
export function pickRound(rounds, requestedNumber) {
  if (!Array.isArray(rounds) || rounds.length === 0) {
    throw new ApiError('Aucune manche publiée pour cette compétition.', 'NO_ROUND');
  }

  if (Number.isInteger(requestedNumber)) {
    const found = rounds.find((r) => r.round_number === requestedNumber);
    if (!found) {
      throw new ApiError(`La manche ${requestedNumber} n'existe pas (1 à ${rounds.length}).`, 'BAD_ROUND');
    }
    return found;
  }

  return (
    rounds.find((r) => r.status === 'active') ??
    [...rounds].sort((a, b) => b.round_number - a.round_number)[0]
  );
}

/** Photo complète : compétition + manche + classement. */
export async function getSnapshot(requestedRound) {
  const [competition, rounds] = await Promise.all([getCompetition(), getRounds()]);
  const round = pickRound(rounds, requestedRound);
  const standings = await getStandings(round.id);

  return {
    competition,
    round,
    rounds,
    standings: standings.standings ?? [],
  };
}
