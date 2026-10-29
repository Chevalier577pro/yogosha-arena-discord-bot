# 🤖 Yogosha Arena — Bot Discord

Bot Discord en Node.js qui expose deux commandes branchées **en direct** sur l’API
publique des compétitions [Yogosha Arena](https://hsg.yogosha.com).

> **Générique et multi-serveurs.** Rien n’est codé en dur : c’est `COMPETITION_ID`
> qui décide quelle compétition est suivie, et les commandes sont enregistrées
> **globalement** — elles apparaissent sur tous les serveurs qui invitent le bot.
> Chacun clone le dépôt, met son propre `COMPETITION_ID` et suit sa compétition.

| Commande | Ce qu’elle fait |
| --- | --- |
| `/leaderboard` | Classement complet de la compétition, paginé : kudos, reports envoyés/acceptés, first bloods, nombre de participants, temps restant avant la fermeture de la manche |
| `/score` | Score détaillé d’**une seule** personne : rang, kudos, écart avec le leader, taux d’acceptation, détail par manche, stats cumulées |

Aucune clé API n’est nécessaire : les endpoints utilisés sont publics.
Licence MIT.

---

## 1. Ce qu’il te faut

- **Node.js 20 ou plus** → https://nodejs.org (version LTS)
- Un **compte Discord** et les droits « Gérer le serveur » sur au moins un serveur
- L’URL publique de la compétition à suivre (elle contient son identifiant)
- 5 minutes

Vérifie Node :

```powershell
node --version
```

---

## 2. Installation

```powershell
git clone https://github.com/Chevalier577pro/yogosha-arena-discord-bot.git
cd yogosha-arena-discord-bot
npm install
Copy-Item .env.example .env
```

Ouvre ensuite le fichier `.env` et remplis-le :

```env
DISCORD_TOKEN=le_token_du_bot
COMPETITION_ID=l_identifiant_de_ta_competition
ARENA_BASE_URL=https://hsg.yogosha.com
CACHE_TTL_SECONDS=30
GUILD_ID=
```

### Trouver `COMPETITION_ID`

C’est le **dernier segment** de l’URL de la page publique :

```
https://hsg.yogosha.com/public/competitions/<COMPETITION_ID>
                                            ^^^^^^^^^^^^^^^^^
```

Tu ouvres la compétition dans ton navigateur et tu copies ce segment. Il n’y a
**aucune valeur par défaut** : le bot refuse de démarrer sans lui, pour ne
jamais afficher silencieusement le classement d’une compétition qui n’est pas
la tienne.

`GUILD_ID` reste vide en usage normal (voir §4).

---

## 3. Créer le bot sur Discord

### 3.1 Créer l’application

1. Va sur https://discord.com/developers/applications
2. **New Application** → donne un nom → **Create**
3. Onglet **Bot** → **Reset Token** → **Yes, do it!**
4. **Copie le token** (il ne s’affiche qu’une fois) → colle-le dans `.env` après
   `DISCORD_TOKEN=`
5. Toujours dans **Bot**, vérifie :
   - ✅ **Public Bot** → sinon personne d’autre ne pourra inviter le bot
   - ❌ **Requires OAuth2 Code Grant** → décoché
   - Les *Privileged Gateway Intents* restent **désactivés** : le bot n’a besoin
     que de `Guilds`, qui est natif.

### 3.2 Inviter le bot

```powershell
npm run invite
```

Le script parle à l’API Discord avec ton token, récupère l’ID de l’application et
affiche un lien de la forme :

```
https://discord.com/oauth2/authorize?client_id=<ton_id>&permissions=<perms>&scope=bot%20applications.commands
```

Envoie ce lien à qui tu veux : **toute personne ayant « Gérer le serveur » peut
ajouter le bot à son serveur** avec ce seul lien. Il inclut les scopes
`bot` + `applications.commands` et les permissions minimales (Voir les salons,
Envoyer des messages, Intégrer des liens, Lire l’historique).

Le script te prévient aussi si **Public Bot** est désactivé — c’est le piège
classique quand le bot refuse de s’ajouter ailleurs.

---

## 4. Commandes globales vs serveur de test

| `GUILD_ID` dans `.env` | Portée des commandes | Délai d’apparition |
| --- | --- | --- |
| **vide** (défaut) | **Global** — tous les serveurs qui invitent le bot | jusqu’à **1 h** |
| renseigné | Uniquement ce serveur | instantané |

En production, laisse `GUILD_ID` vide. Ne le renseigne que pour développer.

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
[…] Connecté en tant que <ton_bot>
[…] 2 commande(s) enregistrée(s) globalement (propagation jusqu’à 1 h)
[…] Compétition suivie : <COMPETITION_ID>
```

`Ctrl + C` pour arrêter.

Au-delà de 75 serveurs, Discord exige une **vérification** de l’application
(formulaire, quelques jours) avant d’augmenter la limite.

---

## 6. Utilisation

### `/leaderboard`

```
/leaderboard
/leaderboard manche:1
```

15 joueurs par page, boutons ◀ / ▶ (seul l’auteur de la commande peut cliquer).

- **Podium** (page 1) : 🥇 🥈 🥉, ex-kæquo regroupés
- **Tableau coloré** : 1ᵉʳ en or, 2ᵉ en blanc, 3ᵉ en magenta — et **ta propre
  ligne en vert** si `data/players.json` contient ton ID Discord
- **Manche** : numéro, fenêtre horaire et **temps restant** avant fermeture
- **Participants** (et éliminés), **kudos en jeu**, **reports** envoyés → acceptés

Colonnes : `#` rang · `Joueur` · `KUDOS` (le score) · `REP` reports envoyés ·
`ACC` reports acceptés · `FB` first bloods.

> Le tableau utilise un bloc de code ```ansi : les couleurs sont possibles tout en
> gardant l’alignement monospace. Les pseudos sont rendus en texte brut, donc
> aucune mention `@everyone` ne peut être déclenchée.

### `/score`

```
/score user:@membre          → résout le pseudo via data/players.json
/score joueur:<pseudo>       → pseudo exact (autocomplétion incluse)
/score user:@membre manche:1 → sur une manche précise
```

Résolution du pseudo, dans l’ordre :

1. l’option `joueur`
2. la correspondance déclarée dans `data/players.json`
3. le pseudo Discord (surnom du serveur, sinon nom global)

Si plusieurs joueurs correspondent, le bot répond avec la liste et demande de
préciser.

### Relier un membre Discord à un pseudo

`data/players.json` est une simple table, **partagée par tous les serveurs** :

```json
{
  "<id_discord_du_membre>": "<pseudo_exact_sur_la_plateforme>"
}
```

Clé = ID Discord (mode développeur → clic droit sur le membre → Copier l’ID),
valeur = pseudo **exact** sur la plateforme. Redémarre le bot après modification.

---

## 7. L’API utilisée

Base : `https://hsg.yogosha.com/api`. Tout est public, en lecture seule, sans
authentification.

| Méthode | Endpoint | Contenu |
| --- | --- | --- |
| GET | `/api/public/competitions/{id}` | nom, description, mode, statut, nombre de manches, top 3 |
| GET | `/api/public/competitions/{id}/rounds` | manches : `id`, `round_number`, `start_date`, `end_date`, `status` |
| GET | `/api/public/competitions/{id}/rounds/{roundId}/standings` | classement complet (tous les participants) |
| GET | `/api/public/competitions/{id}/hunters/{hunterId}` | détail d’un participant : kudos par manche, rang, stats cumulées |
| GET | `/api/public/competitions/{id}/events?since_id=0` | flux d’événements |

Champs d’une ligne de `standings` → colonnes du bot (la fonction `toTableRow` fait
la traduction) :

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
  (l’API répond `unable to parse string as an integer`).
- Tout est **caché 30 s** côté bot (`CACHE_TTL_SECONDS`) pour ne pas marteler
  l’API. Les données affichées ont donc au pire 30 secondes de retard.

Tester l’API à la main (remplace `<COMPETITION_ID>`) :

```powershell
curl.exe "https://hsg.yogosha.com/api/public/competitions/<COMPETITION_ID>/rounds"
```

---

## 8. Vérifier que tout marche sans Discord

```powershell
npm run smoke
```

Interroge l’API, **construit les vrais embeds** (les mêmes fonctions que le bot),
vérifie qu’aucun champ n’est `undefined`, que rien ne dépasse les limites Discord,
et affiche le rendu. Si ce script passe, un problème restant vient du token ou des
permissions Discord.

---

## 9. Déployer sur Render

Si le bot tourne sur ton PC, il s’arrête avec le terminal et les commandes
disparaissent pour tout le monde. Render héberge le process pour toi.

Le dépôt contient déjà `render.yaml` (blueprint) et `src/server.js` (serveur de
santé `/health`, démarré **seulement** si la variable `PORT` existe — donc
inutile en local).

### 9.1 Préparer le dépôt

Le code doit être sur **ton** compte GitHub (fork ou clone + push) :

```powershell
git clone https://github.com/Chevalier577pro/yogosha-arena-discord-bot.git
cd yogosha-arena-discord-bot
```

`.env` n’est pas versionné : sur Render, tout passe par des **variables
d’environnement** dans l’interface.

### 9.2 Déploiement en un clic (blueprint)

1. Va sur https://dashboard.render.com → **New +** → **Blueprint**
2. Connecte ton compte GitHub, sélectionne ton fork du dépôt
3. Render lit `render.yaml` et propose le service `yogosha-arena-bot`
4. Il demande les deux secrets marqués `sync: false` :
   - `DISCORD_TOKEN` → le token du §3.1
   - `COMPETITION_ID` → le dernier segment de l’URL de ta compétition (§2)
5. **Apply** → premier déploiement

### 9.3 Déploiement manuel (sans blueprint)

1. **New +** → **Web Service** (ou **Background Worker**, voir §9.5)
2. **Connect a repository** → ton dépôt
3. Renseigne :
   - **Name** : `yogosha-arena-bot`
   - **Region** : `Frankfurt` (le plus proche de la France)
   - **Branch** : `main`
   - **Runtime** : `Node`
   - **Build Command** : `npm ci`
   - **Start Command** : `npm start`
   - **Instance Type** : `Free` (ou `Starter`)
4. Onglet **Environment** → **Add Environment Variable** :

   | Clé | Valeur |
   | --- | --- |
   | `DISCORD_TOKEN` | ton token Discord |
   | `COMPETITION_ID` | l’identifiant de ta compétition |
   | `ARENA_BASE_URL` | `https://hsg.yogosha.com` *(optionnel)* |
   | `CACHE_TTL_SECONDS` | `30` *(optionnel)* |

5. Onglet **Settings** → **Health Check Path** : `/health`
6. **Create Web Service**

> `GUILD_ID` : **ne la mets pas** en production, sinon les commandes ne sont
> enregistrées que sur un seul serveur.

### 9.4 Vérifier que ça tourne

- Onglet **Logs** : tu dois voir la connexion, l’enregistrement des commandes et
  `Compétition suivie : …`
- `https://<ton-service>.onrender.com/health` doit renvoyer :

  ```json
  { "ok": true, "ready": true, "bot": "…", "guilds": 0, "competition": "…", "uptimeSeconds": 42 }
  ```

  `"ready": true` = le bot est connecté à Discord.
- Dans Discord, `/leaderboard` doit répondre (jusqu’à 1 h pour la première
  apparition des commandes globales)

### 9.5 Offre gratuite : le piège du sommeil

Render **endort** un service Web gratuit après **15 minutes sans requête HTTP**.
Un bot Discord n’envoie pas de requêtes HTTP entrantes : il se fait donc
déconnecter, et les commandes cessent de répondre.

Deux solutions :

**A. Réveiller le service par un ping externe (gratuit)**

1. Crée un moniteur sur https://cron-job.org ou https://uptimerobot.com
2. URL à appeler : `https://<ton-service>.onrender.com/health`
3. Intervalle : **10 minutes**
4. C’est tout : chaque ping réveille le service et le maintient éveillé.

Le serveur `/health` existe exactement pour ça : il répond en JSON, sans toucher
à Discord ni à l’API de la plateforme.

**B. Background Worker (payant, sans sommeil)**

Un worker ne dort jamais et n’a pas besoin de port HTTP. Dans `render.yaml`,
remplace `type: web` par `type: worker`, `plan: free` par `plan: starter`, et
supprime `healthCheckPath`. Compte ~7 $/mois.

### 9.6 Mettre à jour le bot

`autoDeploy: true` dans `render.yaml` : chaque `git push` sur `main` redéploie
automatiquement. Sinon, **Manual Deploy → Deploy latest commit** dans le
dashboard.

Les commandes sont réenregistrées à chaque démarrage : rien à faire à la main.

### 9.7 Autres hébergeurs

- **VPS** : `npm ci`, puis `pm2 start src/index.js --name arena-bot` + `pm2 save`
- **Railway / Fly.io** : mêmes variables d’environnement, `npm start`, pas besoin
  de `PORT` (Fly demande un `internal_port`, mets celui de `PORT`)
- **Raspberry Pi / vieux PC** : identique en local, branché en permanence

Ne mets **jamais** le token Discord dans le code ou dans Git : uniquement dans les
variables d’environnement de l’hébergeur.

---

## 10. Structure du projet

```
.
├─ src/
│  ├─ index.js              point d’entrée, connexion + routage des interactions
│  ├─ config.js             lecture et validation du .env
│  ├─ api.js                client de l’API publique + cache 30 s
│  ├─ format.js             tableau ANSI, podium, durées, normalisation
│  ├─ players.js            chargement de data/players.json
│  ├─ server.js             serveur de santé /health (hébergeurs uniquement)
│  ├─ deploy-commands.js    enregistrement manuel des slash commands
│  └─ commands/
│     ├─ leaderboard.js     /leaderboard
│     └─ score.js           /score (+ autocomplétion)
├─ data/players.json        mapping ID Discord → pseudo plateforme
├─ scripts/
│  ├─ smoke.mjs             test hors Discord
│  └─ invite.mjs            lien d’invitation + vérification Public Bot
├─ render.yaml              blueprint de déploiement Render
├─ .nvmrc                   version de Node (22)
├─ .env.example             modèle de configuration
├─ LICENSE                  MIT
└─ package.json
```

---

## 11. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `COMPETITION_ID manquant` | `.env` incomplet | copie le segment final de l’URL de la compétition |
| `COMPETITION_ID invalide` | URL entière au lieu de l’ID | garde uniquement le dernier segment |
| `Variable manquante : DISCORD_TOKEN` | `.env` absent ou vide | `Copy-Item .env.example .env` puis remplis |
| `An invalid token was provided` | token faux ou régénéré | Reset Token + nouveau `.env` |
| Quelqu’un d’autre ne peut pas ajouter le bot | **Public Bot** désactivé | §3.1, puis `npm run invite` |
| Les commandes n’apparaissent pas ailleurs | global encore en propagation | attends 1 h, ou `npm run deploy` |
| Les commandes n’apparaissent pas du tout | scope `applications.commands` manquant | réinvite avec `npm run invite` |
| `Missing Access` | permission manquante dans le salon | donne « Voir le salon » + « Envoyer des messages » au bot |
| `Joueur introuvable` | pseudo Discord ≠ pseudo plateforme | ajoute une entrée dans `data/players.json` |
| Le bot marche puis **meurt après ~15 min** sur Render | service gratuit endormi | ping externe sur `/health` ou Background Worker (§9.5) |
| Render affiche **No open ports detected** | le bot n’écoute pas `PORT` | supprime `PORT` en local, laisse Render l’injecter ; vérifie `/health` |
| Logs Render : `Variable manquante` | variable absente du dashboard | onglet **Environment**, pas `.env` (qui n’est pas versionné) |
| `/health` renvoie `"ready": false` | process démarré, Discord pas encore connecté | attends quelques secondes, sinon token invalide |
| `L’API a répondu HTTP 5xx` | souci côté plateforme | réessaie, le bot ne casse pas |
| `HTTP 404` | `COMPETITION_ID` d’une compétition inexistante | vérifie l’URL |

---

## 12. Sécurité et vie privée

- `.env` est dans `.gitignore` : le token ne part jamais sur GitHub.
- Les données lues sont publiques : classement et statistiques affichés par la
  plateforme elle-même.
- Le tableau est envoyé en bloc de code monospace — les pseudos ne peuvent pas
  casser la mise en forme ni injecter de mention `@everyone`.
- Aucun stockage : le bot ne conserve ni messages, ni historique, ni profils.

---

## Licence

MIT — voir [LICENSE](LICENSE). Les données appartiennent à Yogosha et aux
participants ; ce bot ne fait que lire leur API publique.
