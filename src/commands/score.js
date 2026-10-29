import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getHunter, getSnapshot } from '../api.js';
import { bar, describeWindow, fitField, normalize, ratio } from '../format.js';
import { loadPlayers } from '../players.js';

export const data = new SlashCommandBuilder()
  .setName('score')
  .setDescription("Score détaillé d'un seul joueur")
  .addUserOption((option) =>
    option.setName('user').setDescription('Le membre Discord dont tu veux le score').setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName('joueur')
      .setDescription('Ou directement le pseudo Yogosha (autocomplétion incluse)')
      .setAutocomplete(true)
      .setRequired(false),
  )
  .addIntegerOption((option) =>
    option
      .setName('manche')
      .setDescription('Numéro de manche (par défaut : la manche en cours)')
      .setMinValue(1)
      .setRequired(false),
  );

function matchHunter(standings, wanted) {
  const target = normalize(wanted);

  const exact = standings.filter((row) => normalize(row.display_name) === target);
  if (exact.length === 1) return exact;

  const prefix = standings.filter((row) => normalize(row.display_name).startsWith(target));
  if (prefix.length === 1) return prefix;

  const partial = standings.filter((row) => normalize(row.display_name).includes(target));
  return [...exact, ...prefix, ...partial].filter(
    (row, index, all) => all.findIndex((other) => other.participant_id === row.participant_id) === index,
  );
}

function candidateList(matches) {
  return matches
    .slice(0, 15)
    .map((row) => `• **${row.display_name}** — ${row.total_kudos} kudos (rang ${row.rank})`)
    .join('\n');
}

/**
 * Construit l'embed /score. Exporté pour que scripts/smoke.mjs teste le vrai rendu.
 */
export function buildScoreEmbed(snapshot, row, detail) {
  const { standings, competition, round, rounds } = snapshot;

  const leaderKudos = standings.reduce((best, item) => Math.max(best, item.total_kudos ?? 0), 0);
  const totalKudos = standings.reduce((sum, item) => sum + (item.total_kudos ?? 0), 0);
  const gap = leaderKudos - (row.total_kudos ?? 0);
  const roundDetail = detail?.rounds ?? [];

  const embed = new EmbedBuilder()
    .setColor(row.is_eliminated ? 0x808080 : 0x7c5cff)
    .setAuthor({ name: `Score de ${row.display_name}` })
    .setTitle(`Rang ${row.rank} · ${row.total_kudos ?? 0} kudos`)
    .setDescription(
      [
        `**Manche ${round.round_number}** — ${round.status}`,
        describeWindow(round.start_date, round.end_date),
        '',
        `${bar(row.total_kudos ?? 0, leaderKudos)} ${row.total_kudos ?? 0}/${leaderKudos} du leader`,
      ].join('\n'),
    )
    .addFields(
      { name: 'Kudos', value: `**${row.total_kudos ?? 0}**`, inline: true },
      { name: 'Rang', value: `**${row.rank ?? '—'}** / ${standings.length}`, inline: true },
      { name: 'Écart avec le 1er', value: gap > 0 ? `-${gap}` : '🏆 leader', inline: true },
      { name: 'Reports envoyés', value: String(row.report_count ?? 0), inline: true },
      {
        name: 'Reports acceptés',
        value: `${row.accepted_count ?? 0} (${ratio(row.accepted_count ?? 0, row.report_count ?? 0)})`,
        inline: true,
      },
      { name: 'First bloods', value: String(row.first_blood_count ?? 0), inline: true },
      { name: 'Critiques', value: String(row.critical_count ?? 0), inline: true },
      { name: 'Statut', value: row.is_eliminated ? '❌ éliminé' : '✅ en course', inline: true },
      { name: 'Part des kudos', value: `${ratio(row.total_kudos ?? 0, totalKudos)} du total`, inline: true },
    );

  if (roundDetail.length > 0) {
    embed.addFields({
      name: 'Détail par manche',
      value: fitField(
        roundDetail
          .map(
            (item) =>
              `**M${item.round_number}** — ${item.total_kudos ?? 0} kudos · rang ${item.rank ?? '—'}${item.is_eliminated ? ' · éliminé' : ''}`,
          )
          .join('\n'),
      ),
      inline: false,
    });
  }

  if (detail && (detail.lifetime_kudos != null || detail.lifetime_reports != null)) {
    embed.addFields({
      name: 'Statistiques cumulées (compétition entière)',
      value: fitField(
        [
          `Kudos : **${detail.lifetime_kudos ?? '—'}**`,
          `Reports : **${detail.lifetime_reports ?? '—'}**`,
          `First bloods : **${detail.lifetime_first_bloods ?? '—'}**`,
        ].join(' · '),
      ),
      inline: false,
    });
  }

  return embed
    .setFooter({ text: `${competition.name} · manche ${round.round_number}/${rounds.length}` })
    .setTimestamp();
}

export async function execute(interaction) {
  const user = interaction.options.getUser('user');
  const pseudo = interaction.options.getString('joueur')?.trim();
  const requestedRound = interaction.options.getInteger('manche');

  if (!user && !pseudo) {
    await interaction.reply({
      content: 'Précise un membre avec l’option `user`, ou un pseudo avec l’option `joueur`.',
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const snapshot = await getSnapshot(requestedRound ?? undefined);
  const { standings, round } = snapshot;

  const players = await loadPlayers();

  let member = null;
  if (user) {
    try {
      member = interaction.options.getMember('user');
    } catch {
      member = null;
    }
  }

  const discordName = member?.displayName ?? member?.nick ?? user?.globalName ?? user?.username;
  const wanted = pseudo || players[user?.id] || discordName;

  const matches = matchHunter(standings, wanted);

  if (matches.length === 0) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle('Joueur introuvable')
          .setDescription(
            `Aucun participant ne correspond à **${wanted}** dans la manche ${round.round_number}.\nUtilise l’autocomplétion de l’option \`joueur\` pour choisir un pseudo exact.`,
          ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (matches.length > 1) {
    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0xfaa61a)
          .setTitle(`Plusieurs joueurs pour « ${wanted} »`)
          .setDescription(candidateList(matches))
          .setFooter({ text: 'Relance /score avec le pseudo exact.' }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const row = matches[0];
  const detail = await getHunter(row.participant_id).catch(() => null);

  await interaction.reply({ embeds: [buildScoreEmbed(snapshot, row, detail)] });
}

export async function autocomplete(interaction) {
  const focused = interaction.options.getFocused(true);
  if (focused.name !== 'joueur') {
    await interaction.respond([]);
    return;
  }

  const query = normalize(focused.value);
  const snapshot = await getSnapshot();
  const suggestions = snapshot.standings
    .filter((row) => !query || normalize(row.display_name).includes(query))
    .sort((a, b) => b.total_kudos - a.total_kudos)
    .slice(0, 25)
    .map((row) => ({
      name: `${row.display_name} — ${row.total_kudos} kudos (rang ${row.rank})`.slice(0, 100),
      value: row.display_name,
    }));

  await interaction.respond(suggestions);
}
