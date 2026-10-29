# 🤖 Yogosha Arena — Bot Discord

Bot Discord en Node.js qui expose deux commandes branchées **en direct** sur l’API
publique de [hsg.yogosha.com](https://hsg.yogosha.com).

> **Fonctionne sur n’importe quel serveur.** Les commandes sont enregistrées
> **globalement** : dès que le bot rejoint un serveur, `/leaderboard` et `/score`
> y sont disponibles. Aucune configuration par serveur.

| Commande | Ce qu’elle fait |
| --- | --- |
| `/leaderboard` | Classement complet de la compétition, paginé, avec kudos, reports envoyés/acceptés, first bloods, nombre de participants, temps restant avant la fermeture de la manche |
| `/score` | Score détaillé d’**une seule** personne : rang, kudos, écart avec le leader, taux d’acceptation, détail par manche, stats cumulées |

Aucune clé API n’est nécessaire : les endpoints utilisés sont publics. Licence MIT.

---

## 1. Ce qu’il te faut

- **Node.js 20 ou plus** → https://nodejs.org (version LTS)
- Un **compte Discord** et les droits « Gérer le serveur » sur au moins un serveur
- 5 minutes

Vérifie Node :

```powershell
node --version
```

---

## 2. Installation (sur ta machine)

```powershell
cd "C:\Users\Alexandre\Documents\dsc bot"
npm install
Copy-Item .env.example .env
```

Ouvre ensuite le fichier `.env` et remplis-le :

```env
DISCORD_TOKEN=le_token_du_bot
COMPETITION_ID=m58ywQeiPK8Iz9u4oDS0Rw
ARENA_BASE_URL=https://hsg.yogosha.com
CACHE_TTL_SECONDS=30
GUILD_ID=
```

- `COMPETITION_ID` = l’identifiant dans l’URL
  `https://hsg.yogosha.com/public/competitions/<ID>`
- `GUILD_ID` **reste vide** en usage normal (voir §4)

---

## 3. Créer le bot sur Discord

### 3.1 Créer l’application

1. Va sur https://discord.com/developers/applications
2. **New Application** → donne un nom (ex. `Arena Buddy`) → **Create**
3. Onglet **Bot** (menu de gauche) → **Reset Token** → **Yes, do it!**
4. **Copie le token** (il ne s’affiche qu’une fois) → colle-le dans `.env` après
   `DISCORD_TOKEN=`
5. Toujours dans **Bot**, vérifie / active :
   - ✅ **Public Bot** → sinon personne d’autre ne pourra inviter le bot
   - ❌ **Requires OAuth2 Code Grant** → décoché
   - Les *Privileged Gateway Intents* restent **désactivés** : le bot n’a besoin
     que de `Guilds`, qui est natif.

### 3.2 Inviter le bot (sur ton serveur ou sur n’importe quel autre)

```powershell
npm run invite
```

Le script parle à l’API Discord avec ton token, récupère l’ID de l’application et
affiche un lien du type :

```
https://discord.com/oauth2/authorize?client_id=1234...&permissions=84992&scope=bot%20applications.commands
```

Envoie ce lien à qui tu veux : **toute personne ayant « Gérer le serveur » peut
ajouter le bot à son serveur** avec ce seul lien. Il inclut déjà les scopes
`bot` + `applications.commands` et les permissions minimales (Voir les salons,
Envoyer des messages, Intégrer des liens, Lire l’historique).

Le script te prévient aussi si **Public Bot** est désactivé — c’est le piège
classique quand le bot refuse de s’ajouter ailleurs.

### 3.3 Vérifier

```powershell
npm run invite
```

Tu dois voir `Public Bot : oui`, `OAuth2 code grant : non`.

---

## 4. Commandes globales vs serveur de test

| `GUILD_ID` dans `.env` | Portée des commandes | Délai d’apparition |
| --- | --- | --- |
| **vide** (défaut) | **Global** — tous les serveurs qui invitent le bot | jusqu’à **1 h** |
| renseigné | Uniquement ce serveur | instantané |

En production, laisse `GUILD_ID` vide. Ne le renseigne que pour développer : envoyer
une commande globale à chaque modification fait attendre une heure avant de tester.

Pour forcer une mise à jour globale :

```powershell
npm run deploy
```

---

## 5. Lancer le bot

```powershell
npm start
```

Tu dois voir :

```
[2026-10-29T…] Connecté en tant que Arena Buddy#1234
[2026-10-29T…] 2 commande(s) enregistrée(s) globalement (propagation jusqu’à 1 h)
[2026-10-29T…] Compétition suivie : m58ywQeiPK8Iz9u4oDS0Rw
```

`Ctrl + C` pour arrêter.

Combien de serveurs ? Discord n’affiche pas la liste dans le script, mais tu peux
la voir dans le **Developer Portal → ton app → Bot**. Au-delà de 75 serveurs,
Discord exige une **vérification** (formulaire, quelques jours) avant d’augmenter
la limite à 2500 commandes globales et plus de serveurs.

---

## 6. Utilisation

### `/leaderboard`

```
/leaderboard
/leaderboard manche:1
```

Affiche 15 joueurs par page, avec les boutons ◀ / ▶ (seul l’auteur de la commande
peut cliquer).

- **Podium** (page 1) : 🥇 🥈 🥉 avec les ex-kæquo regroupés
- **Tableau coloré** : 1ᵉʳ en or, 2ᵉ en blanc, 3ᵉ en magenta — et **ta propre
  ligne en vert** si `data/players.json` contient ton ID Discord
- **Manche** : numéro, fenêtre horaire et **temps restant** avant fermeture
- **Participants** (et éliminés), **kudos en jeu**, **reports** envoyés → acceptés

Colonnes : `#` rang · `Joueur` · `KUDOS` (le score) · `REP` reports envoyés ·
`ACC` reports acceptés · `FB` first bloods.

> Le tableau utilise un bloc de code ```ansi, ce qui permet les couleurs tout en
> gardant l’alignement en police monospace. Les pseudos sont rendus en texte
> brut : aucune mention `@everyone` ne peut être déclenchée.

### `/score`

Trois façons de viser quelqu’un :

```
/score user:@Alex            → cherche son pseudo Yogosha via data/players.json
/score joueur:shards         → pseudo exact (autocomplétion incluse)
/score user:@Alex manche:1   → sur une manche précise
```

Résolution du pseudo, dans l’ordre :

1. l’option `joueur`
2. la correspondance déclarée dans `data/players.json`
3. le pseudo Discord (surnom du serveur, sinon nom global)

Si plusieurs joueurs correspondent (ex. `ryo` et `ryozaki`), le bot répond avec
la liste et te demande de préciser.

`data/players.json` est **partagé par tous les serveurs** — c’est une simple table
`ID Discord → pseudo Yogosha` :

```json
{
  "223108435000000001": "shards",
  "223108435000000002": "doume_20"
}
```

Clé = ID Discord (mode développeur → clic droit sur le membre → Copier l’ID),
valeur = pseudo **exact** sur Yogosha. Redémarre le bot après modification.

---

## 7. L’API utilisée

Base : `https://hsg.yogosha.com/api` (configurée via `window.__RUNTIME_CONFIG__.API_BASE_URL`).
Tout est public, en lecture seule, sans authentification.

| Méthode | Endpoint | Contenu |
| --- | --- | --- |
| GET | `/api/public/competitions/{id}` | nom, description, mode, statut, nombre de manches, top 3 |
| GET | `/api/public/competitions/{id}/rounds` | manches : `id`, `round_number`, `start_date`, `end_date`, `status` |
| GET | `/api/public/competitions/{id}/rounds/{roundId}/standings` | **classement complet** (tous les participants) |
| GET | `/api/public/competitions/{id}/hunters/{hunterId}` | détail d’un hunter : kudos par manche, rang, stats cumulées |
| GET | `/api/public/competitions/{id}/events?since_id=0` | flux d’événements (vide sur cette compétition) |

Champs d’une ligne de `standings` → colonnes du bot (`toTableRow` fait la traduction) :

| API | Tableau |
| --- | --- |
| `rank` | `#` |
| `display_name` | `Joueur` |
| `total_kudos` | `KUDOS` |
| `report_count` | `REP` |
| `accepted_count` | `ACC` |
| `first_blood_count` | `FB` |

Deux points à connaître :

- `participant_id` est un **entier** : `/hunters/{id}` refuse un pseudo
  (`{"detail":"...unable to parse string as an integer"}`).
- Tout est **caché 30 s** côté bot (`CACHE_TTL_SECONDS`) pour ne pas marteler
  l’API. Les données affichées ont donc au pire 30 secondes de retard.

Tester l’API à la main :

```powershell
curl.exe https://hsg.yogosha.com/api/public/competitions/m58ywQeiPK8Iz9u4oDS0Rw/rounds
```

---

## 8. Vérifier que tout marche sans Discord

```powershell
npm run smoke
```

Ça interroge l’API, **construit les vrais embeds** (les mêmes fonctions que le
bot), vérifie qu’aucun champ n’est `undefined`, que rien ne dépasse les limites
Discord, et affiche le rendu. Si ce script passe, le problème vient du token ou
des permissions.

---

## 9. Héberger 24/7 (obligatoire pour que d’autres s’en servent)

**Ton PC n’est pas un hébergeur.** Si le bot s’arrête, les commandes disparaissent
pour tout le monde. Trois options simples :

- **VPS** (Hostinger, OVH, Hetzner…) : `npm install`, puis
  `pm2 start src/index.js --name arena-bot` + `pm2 save` — redémarrage auto.
- **Railway / Render / Fly.io** : importe le repo GitHub, ajoute `DISCORD_TOKEN`
  et `COMPETITION_ID` dans les variables d’environnement, commande de démarrage
  `npm start`.
- **Raspberry Pi / vieux PC** : même chose, en local, branché en permanence.

Ne mets **jamais** le token Discord dans le code ou dans Git : uniquement dans les
variables d’environnement.

---

## 10. Structure du projet

```
dsc bot/
├─ src/
│  ├─ index.js              point d’entrée, connexion + routage des interactions
│  ├─ config.js             lecture et validation du .env
│  ├─ api.js                client de l’API publique + cache 30 s
│  ├─ format.js             tableau ANSI, podium, durées, normalisation
│  ├─ players.js            chargement de data/players.json
│  ├─ deploy-commands.js    enregistrement manuel des slash commands
│  └─ commands/
│     ├─ leaderboard.js     /leaderboard
│     └─ score.js           /score (+ autocomplétion)
├─ data/players.json        mapping ID Discord → pseudo Yogosha
├─ scripts/
│  ├─ smoke.mjs             test hors Discord
│  └─ invite.mjs            génère le lien d’invitation + vérifie Public Bot
├─ .env.example             modèle de configuration
├─ LICENSE                  MIT
└─ package.json
```

---

## 11. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `Variable manquante : DISCORD_TOKEN` | `.env` absent ou vide | `Copy-Item .env.example .env` puis remplis |
| `An invalid token was provided` | token faux ou régénéré | Reset Token + nouveau `.env` |
| Quelqu’un d’autre ne peut pas ajouter le bot | **Public Bot** désactivé | §3.1, puis `npm run invite` |
| Les commandes n’apparaissent pas ailleurs | global encore en propagation | attends 1 h, ou `npm run deploy` |
| Les commandes n’apparaissent pas du tout | scope `applications.commands` manquant | réinvite avec `npm run invite` |
| `Missing Access` | permission manquante dans le salon | donne « Voir le salon » + « Envoyer des messages » au bot |
| `Joueur introuvable` | pseudo Discord ≠ pseudo Yogosha | ajoute une entrée dans `data/players.json` |
| `L’API a répondu HTTP 5xx` | souci côté Yogosha | réessaie, le bot ne casse pas |
| Le bot s’arrête à la fermeture du terminal | normal | héberge-le (§9) |

---

## 12. Sécurité

- `.env` est dans `.gitignore`, il ne partira jamais sur GitHub.
- Les données de l’API sont publiques : rien de confidentiel n’est manipulé.
- Le tableau est envoyé en bloc de code monospace — les pseudos ne peuvent pas
  casser la mise en forme ni injecter de mention `@everyone`.
- Aucun stockage : le bot ne conserve ni messages, ni IDs, ni historique.

---

## Licence

MIT — voir [LICENSE](LICENSE). Les données appartiennent à Yogosha et aux
participants ; ce bot ne fait que lire leur API publique.
