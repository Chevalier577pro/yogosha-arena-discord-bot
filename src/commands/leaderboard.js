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
import { buildTable, describeWindow } from '../format.js';

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

function chunk(items, size) {
  const pages = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages.length > 0 ? pages : [[]];
}

function renderPage({ competition, round, rounds, standings }, pages, index) {
  const page = pages[index];
  const totalKudos = standings.reduce((sum, row) => sum + (row.total_kudos ?? 0), 0);
  const accepted = standings.reduce((sum, row) => sum + (row.accepted_count ?? 0), 0);
  const reports = standings.reduce((sum, row) => sum + (row.report_count ?? 0), 0);
  const eliminated = standings.filter((row) => row.is_eliminated).length;

  const embed = new EmbedBuilder()
    .setColor(0x7c5cff)
    .setTitle(`🏆 ${competition.name}`)
    .setDescription(buildTable(page))
    .addFields(
      {
        name: `📍 Manche ${round.round_number} / ${rounds.length}`,
        value: `Statut : **${round.status}**\n${describeWindow(round.start_date, round.end_date)}`,
        inline: false,
      },
      {
        name: '👥 Participants',
        value: `${standings.length}${eliminated ? ` (dont ${eliminated} éliminé·s)` : ''}`,
        inline: true,
      },
      { name: '⚡ Kudos distribués', value: String(totalKudos), inline: true },
      { name: '📨 Reports', value: `${reports} envoyés · ${accepted} acceptés`, inline: true },
    )
    .setFooter({
      text: `Yogosha Arena · page ${index + 1}/${pages.length} · ${competition.mode === 'individual' ? 'compétition individuelle' : competition.mode}`,
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

  const pages = chunk(snapshot.standings, PER_PAGE);
  let index = 0;

  const payload = (i) => ({
    embeds: [renderPage(snapshot, pages, i)],
    components: [buildRow(i, pages.length)],
  });

  const message = await interaction.reply({ ...payload(index), fetchReply: true });

  if (pages.length < 2) return;

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
