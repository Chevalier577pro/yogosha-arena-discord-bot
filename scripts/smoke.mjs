/**
 * Test de fumée hors Discord : vérifie que l'API répond, que les embeds se
 * construisent avec les bons champs et tiennent dans les limites Discord.
 *   npm run smoke
 */
import 'dotenv/config';

process.env.DISCORD_TOKEN ??= 'smoke-test-sans-connexion';

if (!process.env.COMPETITION_ID) {
  console.error(
    'COMPETITION_ID n’est pas défini.\n' +
      'Renseigne-le dans .env : dernier segment de https://hsg.yogosha.com/public/competitions/<ID>',
  );
  process.exit(1);
}

const { getSnapshot, getHunter } = await import('../src/api.js');
const { describeWindow } = await import('../src/format.js');
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

if (standings.length === 0) fail('le classement est vide : /leaderboard n’afficherait rien');

// --- /leaderboard : on teste le vrai chemin de rendu, pas une copie -------
const pages = leaderboard.chunk(standings, 15);

for (let index = 0; index < pages.length; index += 1) {
  const embed = leaderboard.renderEmbed(snapshot, index, { pages });
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

if (JSON.stringify(scoreEmbed.data).includes('undefined')) fail('/score : un champ manque dans l’embed');
if (JSON.stringify(scoreEmbed.data).includes('NaN')) fail('/score : division par zéro dans l’embed');
if ((scoreEmbed.data.fields ?? []).length > 25) fail('/score : trop de champs');

console.log(`--- /score pour « ${target.display_name} » ---`);
console.log(strip(scoreEmbed.data.title));
for (const field of scoreEmbed.data.fields) {
  console.log(`  ${strip(field.name)} : ${strip(field.value)}`);
}
console.log('');

console.log('/leaderboard  :', JSON.stringify(leaderboard.data.toJSON().options.map((option) => option.name)));
console.log('/score        :', JSON.stringify(score.data.toJSON().options.map((option) => option.name)));
console.log('');
console.log('OK — API, rendu des embeds et définition des commandes validés.');
