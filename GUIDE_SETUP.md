# Guide de Configuration Extension Airtable avec Node.js Portable

## 📋 Résumé du Processus

### Étapes Effectuées

1. **Installation du CLI Blocks**
2. **Initialisation du projet**
3. **Lancement en mode développement**


En PowerShell, la syntaxe est différente. Utilisez cette commande :

$env:PATH = "C:\Users\Pret\Documents\node-v22.20.0-win-x64;$env:PATH"; & block run
Ou alternativement :

$env:PATH = "C:\Users\Pret\Documents\node-v22.20.0-win-x64;$env:PATH"; block run
La différence avec CMD :

PowerShell utilise ; comme séparateur au lieu de &&
Pour définir PATH : $env:PATH = "chemin;$env:PATH"
Pour exécuter des commandes externes : préfixer avec & si nécessaire

---

## 🚀 Méthode Recommandée (Avec Node.js Portable)

### 1. Configuration du PATH
Avant toute commande, il faut définir le PATH pour utiliser Node.js portable :

```cmd
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH%
```

### 2. Installation Globale du CLI
```cmd
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH%
npm install -g @airtable/blocks-cli
```

### 3. Initialisation du Projet
```cmd
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH%
block init appwRPz5rSMDwXhdZ/blk80uR5PbgVT0rIB --template=https://github.com/Airtable/apps-hello-world --blockName=influen_extension
```

### 4. Lancer le Serveur de Développement
```cmd
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH%
block run
```

---

## ❌ Difficultés Rencontrées

### Problème 1: `npx` non reconnu
**Cause:** Node portable n'est pas dans le PATH système
**Solution:** Utiliser le chemin complet vers npm/npx ou définir le PATH

### Problème 2: `npm` non reconnu après installation globale
**Cause:** Node.js global pas installé, seulement portable
**Solution:** Même chose, définir le PATH avant chaque commande

### Problème 3: ERESOLVE (conflit de dépendances ESLint)
```
npm error peer eslint@"^3 || ^4 || ^5 || ^6 || ^7 || ^8" from eslint-plugin-react@7.34.3
```
**Cause:** Le template hello-world utilise une ancienne version d'ESLint
**Solution:** Utiliser `--legacy-peer-deps`
```cmd
npm install react react-dom @airtable/blocks --legacy-peer-deps
```

### Problème 4: block.json version invalide
```
Error: block.json version should be "1.0" or undefined
```
**Cause:** Version formatée "1.0.0" au lieu de "1.0"
**Solution:** Changer `"version": "1.0.0"` → `"version": "1.0"`

### Problème 5: Dossier créé avec nom incorrect
```
--blockName=influen_extension
```
**Cause:** Paramètre mal interprété par block init
**Solution:** Déplacer manuellement les fichiers à la racine

---

## ⚠️ Choses à Éviter

1. **NE PAS** utiliser `npm install` seul sans définir le PATH
2. **NE PAS** omettre `--legacy-peer-deps` lors de l'installation des dépendances
3. **NE PAS** utiliser le format de version "1.0.0" dans block.json (utiliser "1.0")
4. **NE PAS** installer de dépendances globalement avec le Node portable (ça ne fonctionne pas)
5. **NE PAS** supprimer le dossier `node_modules` après installation

---

## ✅ Bonnes Pratiques

1. **Toujours** définir le PATH avant chaque commande npm/block
2. **Toujours** vérifier que le terminal est dans le bon dossier (`influen_extension`)
3. **Toujours** utiliser `--legacy-peer-deps` pour les conflits de versions
4. **Vérifier** le fichier `block.json` après initialisation

---

## 📁 Structure du Projet Final

```
influen_extension/
├── .block/
├── .eslintrc.js
├── .gitignore
├── block.json          ← Config (version: "1.0")
├── frontend/
│   ├── index.js        ← Code principal
│   └── style.css
├── LICENSE.md
├── package.json
├── package-lock.json
└── public/
    └── icon.svg
```

---

## 🔧 Commandes Utiles

| Action | Commande |
|--------|----------|
| Lancer le dev server | `set PATH=... && block run` |
| Linter le code | `set PATH=... && npm run lint` |
| Installer dépendance | `set PATH=... && npm install <paquet> --legacy-peer-deps` |
| Reconstruire | `set PATH=... && block build` |
