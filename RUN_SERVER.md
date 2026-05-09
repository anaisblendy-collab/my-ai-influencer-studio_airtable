# Comment Lancer le Serveur de Développement

## 🖥️ Depuis CMD (Invite de Commandes)

1. **Ouvrir CMD** (touche Windows + R, taper `cmd`, Entrée)

2. **Aller dans le dossier du projet:**
```cmd
cd C:\Users\Pret\Documents\influen_extension
```

3. **Définir le PATH Node.js portable:**
```cmd
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH%
```

4. **Lancer le serveur:**
```cmd
block run
```

> ✅ Le serveur sera accessible sur **https://localhost:9000**

---

## 🔵 Depuis Visual Studio Code

### Option 1: Terminal intégré (Recommandé)

1. Ouvrir le dossier `influen_extension` dans VSCode
2. Dans le menu: **Terminal → New Terminal** (ou `Ctrl+ù`)
3. Dans le terminal VSCode, taper:
```cmd
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH%
block run
```

### Option 2: Créer un fichier batch (run.bat)

Créer un fichier `run.bat` à la racine du projet avec ce contenu:

```batch
@echo off
cd /d "%~dp0"
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH%
block run
pause
```

Ensuite, il suffit de double-cliquer sur `run.bat` pour lancer le serveur!

---

## 📝 Commandes Combinées (Une seule ligne)

### CMD:
```cmd
cd C:\Users\Pret\Documents\influen_extension && set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH% && block run
```

### VSCode Terminal:
```cmd
set PATH=C:\Users\Pret\Documents\node-v22.20.0-win-x64;%PATH% && block run
```

---

## 🔄 Si le serveur ne démarre pas

Vérifier que:
1. Le terminal est dans le bon dossier (`influen_extension`)
2. Le PATH est bien défini avant `block run`
3. Aucune autre instance ne tourne sur le port 9000

Pour arrêter le serveur: `Ctrl + C` dans le terminal
