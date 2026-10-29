import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { config } from './config.js';
import * as leaderboard from './commands/leaderboard.js';
import * as score from './commands/score.js';

const rest = new REST().setToken(config.token);
const body = [leaderboard.data.toJSON(), score.data.toJSON()];

const me = await rest.get(Routes.currentUser());
const route = config.guildId
  ? Routes.applicationGuildCommands(me.id, config.guildId)
  : Routes.applicationCommands(me.id);

const result = await rest.put(route, { body });
console.log(`${result.length} commande(s) enregistrée(s) pour ${me.username} ${config.guildId ? `(serveur ${config.guildId})` : '(global)'}.`);
