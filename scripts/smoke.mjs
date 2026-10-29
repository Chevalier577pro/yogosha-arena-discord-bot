/**
 * Test de fumée hors Discord : vérifie que l'API répond, que les embeds se
 * construisent avec les bons champs et tiennent dans les limites Discord.
 *   node scripts/smoke.mjs
 */
process.env.DISCORD_TOKEN ??= 'smoke-test-sans-connexion';
process.env.COMPETITION_ID ??= 'm58ywQeiPK8Iz9u4oDS0Rw';

const { getSnapshot, getHunter } = await import('../src/api.js');
const { describeWindow, humanDuration, bar } = await import('../src/format.js');
const leaderboard = await import('../src/commands/leaderboard.js');
const score = await import('../src/commands/score.js');

const strip = (value) => String(value ?? '').replace(/\u001b\[[0-9;]*m/g, '');
const fail = (message) => {
  console.error(`ECHEC : ${message}`);
  process.exit(1);
};

const snapshot = await getSnapshot();
const { competition, round, rounds, standings } = snapshot;

console.log('Compétition  :', competition.name);
console.log('Mode/statut  :', competition.mode, '/', competition.status);
console.log('Manche       :', round.round_number, '/', rounds.length, '·', round.status);
console.log('Fenêtre      :', describeWindow(round.start_date, round.end_date));
console.log('Participants :', standings.length);
console.log('');

// --- /leaderboard : on teste le vrai chemin de rendu, pas une copie -------
const pages = leaderboard.chunk(standings, 15);

for (let index = 0; index < pages.length; index += 1) {
  const embed = leaderboard.renderEmbed(snapshot, index, { pages, highlight: 'shards' });
  const description = embed.data.description ?? '';

  if (description.includes('undefined') || description.includes('NaN')) {
    fail(`page ${index + 1} : un champ manque dans le tableau`);
  }
  if (description.length > 4096) {
    fail(`page ${index + 1} : description trop longue (${description.length} > 4096)`);
  }
  if ((embed.data.fields ?? []).length > 25) {
    fail(`page ${index + 1} : trop de champs`);
  }
  if (embed.data.footer.text.length > 2048) {
    fail(`page ${index + 1} : footer trop long`);
  }

  if (index === 0) {
    console.log(`--- page 1/${pages.length} (couleurs ANSI retirées pour la console) ---`);
    console.log(strip(description));
    console.log('');
  }
}

console.log(`Pages : ${pages.length} · rendu OK, aucune valeur manquante.`);
console.log('');

// --- /score ---------------------------------------------------------------
const target = standings[0];
const detail = await getHunter(target.participant_id);

for (const field of ['rank', 'display_name', 'total_kudos', 'report_count', 'accepted_count', 'first_blood_count']) {
  if (target[field] === undefined) fail(`standings ne contient pas "${field}" : /score afficherait undefined`);
}

const scoreEmbed = score.buildScoreEmbed(snapshot, target, detail);
const scoreText = JSON.stringify(scoreEmbed.data);

if (scoreText.includes('undefined') || scoreText.includes('NaN')) {
  fail('/score : un champ manque dans l’embed');
}
if ((scoreEmbed.data.fields ?? []).length > 25) {
  fail('/score : trop de champs');
}

console.log(`--- /score ${target.display_name} ---`);
console.log(strip(scoreEmbed.data.title));
for (const field of scoreEmbed.data.fields) {
  console.log(`  ${strip(field.name)} : ${strip(field.value)}`);
}
console.log('');

console.log('/leaderboard  :', JSON.stringify(leaderboard.data.toJSON().options.map((option) => option.name)));
console.log('/score        :', JSON.stringify(score.data.toJSON().options.map((option) => option.name)));
console.log('');
console.log('OK — API, rendu des embeds et définition des commandes validés.');
