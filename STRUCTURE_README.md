# AI Influencer Studio - Structure Modulaire TypeScript

## Vue d'ensemble
Extension Airtable moderne avec interface dark/néon pour génération d'influenceurs IA.

## Architecture

```
frontend/
├── index.tsx              ← Point d'entrée Airtable (obligatoire)
│
├── App.tsx                ← Layout global (sidebar + tabs)
│
├── components/
│   ├── Sidebar.tsx        ← Navigation principale
│   ├── CreateTab.tsx      ← Formulaire création influenceur
│   ├── ModelGalleryTab.tsx ← Galerie modèles avec recherche
│   └── HistoryTab.tsx     ← Historique générations
│
├── data/
│   └── models.ts          ← Modèles FLUX, WAN, LoRA + données
│
├── services/
│   ├── airtable.ts        ← Intégration Airtable (sauvegarde records)
│   └── backend.ts         ← APIs Hugging Face, FastAPI, Replicate
│
└── styles/
    └── theme.ts           ← CSS dark/néon injecté
```

## Choix Techniques

### TypeScript vs JavaScript
- **TypeScript choisi** pour :
  - Sécurité des types (interfaces pour modèles, props)
  - Meilleure maintenabilité à long terme
  - Auto-complétion et refactoring
  - Détection d'erreurs à la compilation

### Structure Modulaire
- **Séparation claire** : Composants, données, services, styles
- **Réutilisabilité** : Services indépendants des composants
- **Maintenabilité** : Chaque fichier a une responsabilité unique
- **Tests** : Plus facile à tester unitairement

### Avantages de cette Architecture
1. **Évolutivité** : Ajout facile de nouveaux modèles/services
2. **Testabilité** : Services mockables pour les tests
3. **Performance** : Code splitting et lazy loading possibles
4. **Collaboration** : Structure claire pour l'équipe

## Utilisation

### Développement
```bash
# Démarrer le serveur de développement
./run.bat
# ou
block run
```

### Configuration
1. Ajouter clé API Hugging Face dans paramètres Airtable
2. Créer table "Generations" dans la base (optionnel)

### Déploiement
- Bundle automatiquement généré
- Compatible Airtable Blocks
- Styles injectés via `loadCSSFromString()`

## APIs Supportées
- **Hugging Face** : FLUX.1, Stable Diffusion
- **Airtable** : Sauvegarde des générations
- **Backend personnalisé** : FastAPI/Replicate (extensible)

## Fonctionnalités
- ✅ Interface dark/néon moderne
- ✅ 3 onglets principaux (Créer/Galerie/Historique)
- ✅ Recherche et filtres de modèles
- ✅ Génération images/vidéos
- ✅ Intégration Airtable complète
- 🚧 Historique persistant (à implémenter)
- 🚧 Templates personnalisés (à venir)</content>
</xai:function_call</xai:function_call
<parameter name="path">STRUCTURE_README.md