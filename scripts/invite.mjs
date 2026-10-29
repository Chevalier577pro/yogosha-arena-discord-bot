import 'dotenv/config';
import { PermissionsBitField, REST, Routes } from 'discord.js';
import { config } from '../src/config.js';

/**
 * Génère le lien d'invitation du bot, avec exactement les permissions utiles.
 *   npm run invite
 */
const rest = new REST().setToken(config.token);

const me = await rest.get(Routes.currentUser());

let application = null;
try {
  application = await rest.get('/applications/@me');
} catch {
  application = null;
}

const permissions = new PermissionsBitField([
  PermissionsBitField.Flags.ViewChannel,
  PermissionsBitField.Flags.SendMessages,
  PermissionsBitField.Flags.EmbedLinks,
  PermissionsBitField.Flags.ReadMessageHistory,
]);

const invite = new URL('https://discord.com/oauth2/authorize');
invite.searchParams.set('client_id', me.id);
invite.searchParams.set('permissions', String(permissions.bitfield));
invite.searchParams.set('scope', 'bot applications.commands');
invite.searchParams.set('integration_type', '0');

console.log(`Bot       : ${me.username} (${me.id})`);
console.log(`Permissions : ${permissions.toArray().join(', ')}`);
console.log('');
console.log('Lien d’invitation (fonctionne sur n’importe quel serveur) :');
console.log(invite.toString());
console.log('');

if (application) {
  console.log(`Public Bot            : ${application.bot_public ? 'oui' : 'NON — active-le dans Developer Portal > Bot'}`);
  console.log(`OAuth2 code grant     : ${application.bot_require_code_grant ? 'oui (à décocher)' : 'non'}`);
  const interactionsUrl = application.interactions_endpoint_url;
  console.log(`Endpoint interactions : ${interactionsUrl ?? 'gateway (normal)'}`);
}

console.log('');
console.log('Rappel : les commandes globales peuvent mettre jusqu’à 1 h à apparaître');
console.log('sur un nouveau serveur. Pour tester tout de suite, mets GUILD_ID dans .env.');
