import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';
import { getSnapshot } from '../api.js';
import { buildTable, describeWindow, podium, toTableRow } from '../format.js';
import { loadPlayers } from '../players.js';

const PER_PAGE = 15;
const COLLECTOR_MS = 180_000;

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('Classement complet de la compétition, avec le détail de chaque joueur')
  .addIntegerOption((option) =>
    option
      .setName('manche')
      .setDescription('Numéro de manche (par défaut : la manche en cours)')
      .setMinValue(1)
      .setRequired(false),
  );

export function chunk(items, size) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length > 0 ? pages : [[]];
}

/**
 * Construit l'embed d'une page de classement.
 * Exporté pour que scripts/smoke.mjs teste exactement le rendu du bot.
 */
export function renderEmbed(snapshot, index, { perPage = PER_PAGE, highlight = null, pages = null } = {}) {
  const { competition, round, rounds, standings } = snapshot;
  const allPages = pages ?? chunk(standings, perPage);
  const page = allPages[index] ?? [];
  const rows = page.map(toTableRow);

  const totalKudos = standings.reduce((sum, row) => sum + (row.total_kudos ?? 0), 0);
  const accepted = standings.reduce((sum, row) => sum + (row.accepted_count ?? 0), 0);
  const reports = standings.reduce((sum, row) => sum + (row.report_count ?? 0), 0);
  const eliminated = standings.filter((row) => row.is_eliminated).length;

  const from = index * perPage + 1;
  const to = from + page.length - 1;

  const top = index === 0 && standings.length > 0 ? `${podium(standings)}\n\n` : '';

  const embed = new EmbedBuilder()
    .setColor(0x7c5cff)
    .setTitle(`🏆 ${competition.name}`)
    .setDescription(`${top}${buildTable(rows, { highlight })}`)
    .addFields(
      {
        name: `⚔️ Manche ${round.round_number} / ${rounds.length}`,
        value: `${describeWindow(round.start_date, round.end_date)}`,
        inline: false,
      },
      {
        name: '👥 Participants',
        value: `${standings.length}${eliminated ? ` (${eliminated} éliminé·s)` : ''}`,
        inline: true,
      },
      { name: '⚡ Kudos en jeu', value: String(totalKudos), inline: true },
      { name: '📨 Reports', value: `${reports} → ${accepted} acceptés`, inline: true },
    )
    .setFooter({
      text: `Lignes ${from}–${to} sur ${standings.length} · page ${index + 1}/${allPages.length} · Kudos = score · REP envoyés · ACC acceptés · FB first bloods`,
    })
    .setTimestamp();

  return embed;
}

function buildRow(index, total) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lb:prev')
      .setLabel('◀ Précédent')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index === 0),
    new ButtonBuilder()
      .setCustomId('lb:next')
      .setLabel('Suivant ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(index >= total - 1),
  );
}

export async function execute(interaction) {
  const requested = interaction.options.getInteger('manche');
  const snapshot = await getSnapshot(requested ?? undefined);

  const players = await loadPlayers();
  const highlightName = players[interaction.user.id] ?? null;

  const pages = chunk(snapshot.standings, PER_PAGE);
  let index = 0;

  const payload = (page) => ({
    embeds: [renderEmbed(snapshot, page, { pages, highlight: highlightName })],
    components: [buildRow(page, pages.length)],
  });

  const message = await interaction.reply({ ...payload(index), fetchReply: true });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: COLLECTOR_MS,
  });

  collector.on('collect', async (button) => {
    if (button.user.id !== interaction.user.id) {
      await button.reply({ content: 'Utilise `/leaderboard` pour ton propre classement 👌', flags: MessageFlags.Ephemeral });
      return;
    }

    index = button.customId === 'lb:next' ? Math.min(index + 1, pages.length - 1) : Math.max(index - 1, 0);
    await button.update(payload(index));
  });

  collector.on('end', async () => {
    await message.edit({ components: [] }).catch(() => {});
  });
}
