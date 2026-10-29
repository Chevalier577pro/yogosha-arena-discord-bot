# 🤖 Yogosha Arena — Bot Discord

Bot Discord en Node.js qui expose deux commandes branchées **en direct** sur l’API
publique de [hsg.yogosha.com](https://hsg.yogosha.com) :

| Commande | Ce qu’elle fait |
| --- | --- |
| `/leaderboard` | Classement complet de la compétition, paginé, avec kudos, reports envoyés/acceptés, first bloods, nombre de participants, temps restant avant la fermeture de la manche |
| `/score` | Score détaillé d’**une seule** personne : rang, kudos, écart avec le leader, taux d’acceptation, détail par manche, stats cumulées |

Aucune clé API n’est nécessaire : les endpoints utilisés sont publics.

---

## 1. Ce qu’il te faut

- **Node.js 20 ou plus** → https://nodejs.org (version LTS)
- Un **compte Discord** et les droits « Gérer le serveur » sur ton serveur
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
# GUILD_ID=123456789012345678   <-- optionnel mais recommandé
```

Tu as déjà la bonne valeur pour `COMPETITION_ID` : c’est l’identifiant dans l’URL
`https://hsg.yogosha.com/public/competitions/<ID>`.

---

## 3. Créer le bot sur Discord (le seul truc que tu dois faire à la main)

### 3.1 Créer l’application

1. Va sur https://discord.com/developers/applications
2. **New Application** → donne un nom (ex. `Arena Buddy`) → **Create**
3. Onglet **Bot** (menu de gauche) → **Reset Token** → **Yes, do it!**
4. **Copie le token** (il ne s’affiche qu’une fois) → colle-le dans `.env` après
   `DISCORD_TOKEN=`
5. Toujours dans **Bot**, laisse les *Privileged Gateway Intents* désactivés :
   le bot n’a besoin que de `Guilds`, qui est natif.

### 3.2 Inviter le bot sur ton serveur

1. Onglet **OAuth2** → **URL Generator**
2. Coche les scopes :
   - ✅ `bot`
   - ✅ `applications.commands`
3. Dans **Bot Permissions**, coche :
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Application Commands
4. Copie l’URL générée en bas, ouvre-la dans ton navigateur, choisis ton serveur,
   autorise.

### 3.3 Récupérer l’ID du serveur (recommandé)

Dans Discord : **Paramètres → Avancés → Mode développeur** (à activer), puis
clic droit sur ton serveur → **Copier l’ID du serveur**. Colle-le dans `.env` :

```env
GUILD_ID=123456789012345678
```

> Sans `GUILD_ID`, les commandes sont enregistrées **globalement** et Discord peut
> mettre jusqu’à **1 heure** à les afficher. Avec `GUILD_ID`, c’est instantané.

---

## 4. Lancer le bot

```powershell
npm start
```

Tu dois voir :

```
[2026-10-29T…] Connecté en tant que Arena Buddy#1234
[2026-10-29T…] 2 commande(s) enregistrée(s)
[2026-10-29T…] Compétition suivie : m58ywQeiPK8Iz9u4oDS0Rw
```

Si tu modifies une commande et que Discord ne se met pas à jour :

```powershell
npm run deploy
```

Fais `Ctrl + C` pour arrêter.

---

## 5. Utilisation

### `/leaderboard`

```
/leaderboard
/leaderboard manche:1
```

Affiche 15 joueurs par page, avec les boutons ◀ / ▶ pour naviguer (seul l’auteur
de la commande peut cliquer).

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

### Relier un membre Discord à un pseudo Yogosha

`data/players.json` :

```json
{
  "223108435000000001": "shards",
  "223108435000000002": "doume_20"
}
```

Clé = ID Discord (mode développeur → clic droit sur le membre → Copier l’ID),
valeur = pseudo **exact** sur Yogosha. Le fichier est relu au démarrage du bot ;
redémarre après modification.

---

## 6. L’API utilisée

Base : `https://hsg.yogosha.com/api` (configurée via `window.__RUNTIME_CONFIG__.API_BASE_URL`).
Tout est public, en lecture seule, sans authentification.

| Méthode | Endpoint | Contenu |
| --- | --- | --- |
| GET | `/api/public/competitions/{id}` | nom, description, mode, statut, nombre de manches, top 3 |
| GET | `/api/public/competitions/{id}/rounds` | manches : `id`, `round_number`, `start_date`, `end_date`, `status` |
| GET | `/api/public/competitions/{id}/rounds/{roundId}/standings` | **classement complet** (tous les participants) |
| GET | `/api/public/competitions/{id}/hunters/{hunterId}` | détail d’un hunter : kudos par manche, rang, stats cumulées |
| GET | `/api/public/competitions/{id}/events?since_id=0` | flux d’événements (vide sur cette compétition) |

Champs d’une ligne de `standings` :

```json
{
  "rank": 1,
  "participant_type": "hunter",
  "participant_id": 47,
  "display_name": "shards",
  "total_kudos": 40,
  "report_count": 12,
  "accepted_count": 4,
  "first_blood_count": 0,
  "critical_count": 0,
  "is_eliminated": false,
  "eliminated_at": null
}
```

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

## 7. Vérifier que tout marche sans Discord

```powershell
node scripts/smoke.mjs
```

Ça interroge l’API, affiche le tableau, la fenêtre horaire et le détail d’un
joueur, sans se connecter à Discord. Pratique si le bot ne démarre pas : si ce
script passe, le problème vient du token ou des permissions.

---

## 8. Héberger 24/7 (optionnel)

Le bot s’arrête quand tu fermes le terminal. Trois options simples :

- **VPS** (Hostinger, OVH, Hetzner…) : `npm install`, `npm start`, et
  `pm2 start src/index.js --name arena-bot` pour qu’il redémarre tout seul.
- **Railway / Render / Fly.io** : importe le repo GitHub, ajoute `DISCORD_TOKEN`
  et `COMPETITION_ID` dans les variables d’environnement, commande de démarrage
  `npm start`.
- **Raspberry Pi / vieux PC** : même chose, en local.

Ne mets **jamais** le token Discord dans le code ou dans Git : uniquement dans
les variables d’environnement.

---

## 9. Structure du projet

```
dsc bot/
├─ src/
│  ├─ index.js              point d’entrée, connexion + routage des interactions
│  ├─ config.js             lecture et validation du .env
│  ├─ api.js                client de l’API publique + cache 30 s
│  ├─ format.js             tableau monospace, durées, barres, normalisation
│  ├─ players.js            chargement de data/players.json
│  ├─ deploy-commands.js    enregistrement manuel des slash commands
│  └─ commands/
│     ├─ leaderboard.js     /leaderboard
│     └─ score.js           /score (+ autocomplétion)
├─ data/players.json        mapping ID Discord → pseudo Yogosha
├─ scripts/smoke.mjs        test hors Discord
├─ .env.example             modèle de configuration
└─ package.json
```

---

## 10. Dépannage

| Symptôme | Cause probable | Solution |
| --- | --- | --- |
| `Variable manquante : DISCORD_TOKEN` | `.env` absent ou vide | `Copy-Item .env.example .env` puis remplis |
| `An invalid token was provided` | token faux ou régénéré | Reset Token + nouveau `.env` |
| Les commandes n’apparaissent pas | enregistrement global en cours | mets `GUILD_ID`, redémarre, ou attends 1 h |
| `Missing Access` à l’invitation | scope `applications.commands` manquant | refais l’URL OAuth2 avec les deux scopes |
| `Joueur introuvable` | pseudo Discord ≠ pseudo Yogosha | ajoute une entrée dans `data/players.json` |
| `L’API a répondu HTTP 5xx` | souci côté Yogosha | réessaie, le bot ne casse pas |
| Le bot s’arrête à la fermeture du terminal | normal | héberge-le (§8) |

---

## 11. Sécurité

- `.env` est dans `.gitignore`, il ne partira jamais sur GitHub.
- Les données de l’API sont publiques : rien de confidentiel n’est manipulé.
- Le tableau est envoyé en bloc de code monospace — les pseudos ne peuvent pas
  casser la mise en forme ni injecter de mention `@everyone` (ils sont rendus
  en texte brut dans un ``` ``` ```).
