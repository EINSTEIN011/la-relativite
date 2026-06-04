# 🚀 GUIDE DE DÉPLOIEMENT — La Relativité
## Étapes pour mettre l'app en ligne (accessible partout dans le monde)

---

## Ce dont tu as besoin
- Un ordinateur avec internet
- 30 minutes de ton temps
- Un compte Google (Gmail)

---

## ÉTAPE 1 — Créer la base de données Firebase (gratuit)

Firebase va stocker toutes tes ventes et dépenses en temps réel.

1. Va sur https://firebase.google.com
2. Clique sur **"Commencer"** ou **"Get Started"**
3. Connecte-toi avec ton compte Google
4. Clique sur **"Créer un projet"**
5. Nom du projet : `la-relativite` → Continuer
6. Désactive Google Analytics (pas nécessaire) → Créer le projet
7. Attends 30 secondes, puis clique **Continuer**

### Activer la base de données :
8. Dans le menu gauche, clique sur **"Realtime Database"**
9. Clique **"Créer une base de données"**
10. Choisis la région **"europe-west1 (Belgium)"** → Suivant
11. Sélectionne **"Démarrer en mode test"** → Activer

### Récupérer les clés de connexion :
12. Dans le menu gauche, clique sur l'icône ⚙️ (Paramètres du projet)
13. Descends jusqu'à **"Vos applications"**
14. Clique sur l'icône **</>** (Web)
15. Nom de l'app : `la-relativite` → Enregistrer l'application
16. Tu vas voir un bloc de code avec des valeurs comme :
    ```
    apiKey: "AIza..."
    authDomain: "la-relativite.firebaseapp.com"
    databaseURL: "https://la-relativite-default-rtdb.europe-west1.firebasedatabase.app"
    ...
    ```
17. **COPIE CES VALEURS** — tu en auras besoin à l'étape suivante

---

## ÉTAPE 2 — Configurer le fichier Firebase dans l'app

Ouvre le fichier `src/firebase.js` et remplace chaque valeur :

```javascript
const firebaseConfig = {
  apiKey: "COLLE_TON_API_KEY_ICI",
  authDomain: "COLLE_TON_AUTH_DOMAIN_ICI",
  databaseURL: "COLLE_TON_DATABASE_URL_ICI",
  projectId: "COLLE_TON_PROJECT_ID_ICI",
  storageBucket: "COLLE_TON_STORAGE_BUCKET_ICI",
  messagingSenderId: "COLLE_TON_MESSAGING_SENDER_ID_ICI",
  appId: "COLLE_TON_APP_ID_ICI",
};
```

---

## ÉTAPE 3 — Installer Node.js (si pas encore fait)

1. Va sur https://nodejs.org
2. Télécharge la version **LTS** (recommandée)
3. Installe-la normalement
4. Ouvre un terminal (ou invite de commande) et tape :
   ```
   node --version
   ```
   Tu dois voir un numéro comme `v20.x.x`

---

## ÉTAPE 4 — Lancer l'app en local pour tester

1. Ouvre un terminal dans le dossier `la-relativite`
2. Tape ces commandes une par une :
   ```
   npm install
   npm start
   ```
3. L'app va s'ouvrir automatiquement sur http://localhost:3000
4. Teste que tout fonctionne

---

## ÉTAPE 5 — Déployer sur Vercel (mettre en ligne)

1. Va sur https://vercel.com
2. Clique **"Sign Up"** → connecte-toi avec GitHub ou Google
3. Clique **"Add New Project"**
4. Choisis **"Import Git Repository"**

### Si tu n'as pas GitHub :
- Va sur https://github.com → crée un compte gratuit
- Crée un nouveau repository nommé `la-relativite`
- Upload tous les fichiers du projet dedans
- Retourne sur Vercel et importe ce repository

5. Vercel va détecter React automatiquement
6. Clique **"Deploy"**
7. Attends 2-3 minutes
8. Tu obtiens une URL du type : **`la-relativite.vercel.app`** 🎉

---

## ÉTAPE 6 — Envoyer le lien à ton collaborateur

Envoie-lui simplement le lien par WhatsApp :

```
Voici l'accès à notre système de gestion :
🔗 https://la-relativite.vercel.app

Ton PIN : 1234
```

---

## 🔐 Identifiants de connexion

| Rôle | PIN |
|------|-----|
| 👑 PDG (toi) | `0000` |
| 🧑‍💻 Collaborateur | `1234` |

---

## 💾 Comment les données sont stockées

- Toutes les données sont dans **Firebase Realtime Database**
- C'est une vraie base de données dans le cloud (serveurs Google)
- Les données sont synchronisées **en temps réel** entre toi et ton collaborateur
- Si l'un enregistre une vente, l'autre la voit en quelques secondes
- Les données ne sont **jamais perdues** même si tu fermes l'app
- Gratuit jusqu'à 1 GB de données (largement suffisant pour des années)

---

## 📥 Export Excel

- Connecte-toi en tant que **PDG**
- Va dans **Tableau de bord** ou **Historique**
- Clique sur **"📥 Exporter Excel (.xlsx)"**
- Un fichier Excel sera téléchargé avec 3 feuilles :
  - Ventes
  - Dépenses
  - Résumé mensuel

---

## ❓ Besoin d'aide ?

Si tu bloques sur une étape, note exactement où tu es bloqué et demande de l'aide. Chaque étape est simple mais il faut les faire dans l'ordre.
