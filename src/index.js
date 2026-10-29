import { Client, Events, GatewayIntentBits, MessageFlags } from 'discord.js';
import { config } from './config.js';
import { ApiError } from './api.js';
import * as leaderboard from './commands/leaderboard.js';
import * as score from './commands/score.js';

const log = (...args) => console.log(`[${new Date().toISOString()}]`, ...args);

const commands = new Map(
  [leaderboard, score].map((command) => [command.data.name, command]),
);

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async (ready) => {
  log(`Connecté en tant que ${ready.user.tag}`);

  try {
    const body = [...commands.values()].map((command) => command.data.toJSON());
    const registered = config.guildId
      ? await ready.application.commands.set(body, config.guildId)
      : await ready.application.commands.set(body);
    log(`${registered.size} commande(s) enregistrée(s) ${config.guildId ? `sur le serveur ${config.guildId}` : 'globalement (propagation jusqu’à 1 h)'}`);
  } catch (error) {
    log('Échec de l’enregistrement des commandes :', error.message);
  }

  log(`Compétition suivie : ${config.competitionId}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  const command = interaction.isAutocomplete() || interaction.isChatInputCommand()
    ? commands.get(interaction.commandName)
    : null;

  if (!command) return;

  try {
    if (interaction.isAutocomplete()) {
      await command.autocomplete?.(interaction);
      return;
    }

    if (interaction.isChatInputCommand()) {
      await command.execute(interaction);
    }
  } catch (error) {
    const friendly =
      error instanceof ApiError
        ? error.message
        : 'Une erreur est survenue côté bot. Réessaie dans un instant.';

    log(`Erreur sur /${interaction.commandName} :`, error.message);

    if (interaction.isAutocomplete()) return;

    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: `⚠️ ${friendly}` });
      } else {
        await interaction.reply({ content: `⚠️ ${friendly}`, flags: MessageFlags.Ephemeral });
      }
    } catch {
      /* interaction expirée, rien à faire */
    }
  }
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    log('Arrêt demandé, fermeture du bot.');
    client.destroy();
    process.exit(0);
  });
}

process.on('unhandledRejection', (reason) => log('Promesse rejetée non gérée :', reason));

client.login(config.token);
