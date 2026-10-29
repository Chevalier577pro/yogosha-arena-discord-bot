/**
 * Test de fumée hors Discord : vérifie que l'API répond, que le formatage tient
 * dans les limites d'un embed et que les deux commandes se construisent.
 *   node scripts/smoke.mjs
 */
process.env.DISCORD_TOKEN ??= 'smoke-test-sans-connexion';
process.env.COMPETITION_ID ??= 'm58ywQeiPK8Iz9u4oDS0Rw';

const { getSnapshot, getHunter } = await import('../src/api.js');
const { buildTable, describeWindow, bar, humanDuration } = await import('../src/format.js');
const leaderboard = await import('../src/commands/leaderboard.js');
const score = await import('../src/commands/score.js');

const snapshot = await getSnapshot();
const { competition, round, rounds, standings } = snapshot;

console.log('Compétition :', competition.name);
console.log('Mode       :', competition.mode, '| statut', competition.status);
console.log('Manche     :', round.round_number, '/', rounds.length, '|', round.status);
console.log('Fenêtre    :', describeWindow(round.start_date, round.end_date));
console.log('Participants:', standings.length);
console.log('');

const rows = standings.slice(0, 12).map((row) => ({
  rank: row.rank,
  name: row.display_name,
  kudos: row.total_kudos,
  reports: row.report_count,
  accepted: row.accepted_count,
  firstBloods: row.first_blood_count,
}));

const table = buildTable(rows);
console.log(table);
console.log('Taille du tableau :', table.length, 'caractères (limite embed 4096)');
console.log('');

const first = standings[0];
const detail = await getHunter(first.participant_id);
console.log('Détail de', detail.display_name, JSON.stringify(detail));
console.log('Barre :', bar(first.total_kudos, first.total_kudos), humanDuration(90 * 60 * 1000));
console.log('');

console.log('/leaderboard :', JSON.stringify(leaderboard.data.toJSON().options.map((o) => o.name)));
console.log('/score       :', JSON.stringify(score.data.toJSON().options.map((o) => o.name)));
console.log('');
console.log('OK — tout répond et se construit sans erreur.');
