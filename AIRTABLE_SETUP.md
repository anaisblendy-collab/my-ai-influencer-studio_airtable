# Configuration Airtable - Write Back Guide

## Vue d'ensemble
Ce guide explique comment configurer votre base Airtable pour que l'extension puisse sauvegarder les générations IA selon les [bonnes pratiques officielles](https://airtable.com/developers/extensions/guides/write-back-to-airtable).

## 📋 Configuration Requise

### 1. Créer la Table "AI Generations"

Dans votre base Airtable, créez une nouvelle table nommée exactement : `AI Generations`

### 2. Champs Obligatoires

Ajoutez ces champs exactement avec ces noms et types :

| Nom du Champ | Type | Description |
|-------------|------|-------------|
| `Prompt` | Texte (ligne unique) | Le prompt utilisé pour la génération |
| `Model` | Texte (ligne unique) | Nom du modèle IA utilisé |
| `Type` | Sélection unique | "image" ou "video" |
| `Status` | Sélection unique | "pending", "completed", "failed" |
| `Result URL` | URL | Lien vers l'image/vidéo générée |
| `Created At` | Date et heure | Date de création (fuseau horaire client) |
| `Cost ($)` | Devise | Coût en dollars (symbole $) |

### 3. Configuration des Champs Sélection Unique

Pour les champs `Type` et `Status`, configurez les options :

**Champ "Type" :**
- image
- video

**Champ "Status" :**
- pending
- completed
- failed

### 4. Permissions de l'Extension

Dans les paramètres de l'extension Airtable :
- ✅ Autoriser la création d'enregistrements
- ✅ Autoriser la modification d'enregistrements
- ✅ Autoriser la lecture d'enregistrements

## 🔧 Fonctionnalités Implémentées

### Sauvegarde Automatique
- Chaque génération est automatiquement sauvegardée
- Gestion d'erreurs avec retry
- Validation des champs avant sauvegarde

### Lecture des Données
- Récupération des générations récentes
- Tri par date de création
- Filtrage par statut/type

### Mise à Jour de Statut
- Mise à jour du statut (pending → completed/failed)
- Sauvegarde de l'URL du résultat

## 📊 Structure des Données

Chaque enregistrement contient :
```json
{
  "Prompt": "A beautiful young woman, fashion model...",
  "Model": "FLUX.1 Dev",
  "Type": "image",
  "Status": "completed",
  "Result URL": "https://...",
  "Created At": "2024-01-12T10:30:00Z",
  "Cost ($)": 0.03
}
```

## 🚨 Dépannage

### Erreur "Table not found"
- Vérifiez que la table s'appelle exactement `AI Generations`
- Vérifiez les permissions de l'extension

### Erreur "Missing fields"
- Vérifiez que tous les champs sont présents avec les bons noms
- Vérifiez les types de champs

### Erreur "Permission denied"
- Vérifiez les permissions de l'extension dans les paramètres
- L'extension doit avoir les droits de lecture/écriture

## 📈 Utilisation Avancée

### Requêtes Personnalisées
```typescript
// Récupérer les générations d'aujourd'hui seulement
const today = new Date();
const records = await airtableService.getRecentGenerations(50);
// Filtrer côté client si nécessaire
```

### Intégration avec Workflows
- Utilisez Airtable Automations pour traiter les nouvelles générations
- Envoyez des notifications quand une génération est terminée
- Déclenchez des actions basées sur le statut

## 🔒 Sécurité
- L'extension ne peut écrire que dans la table configurée
- Validation des données avant sauvegarde
- Gestion d'erreurs pour éviter la corruption des données

## 📚 Ressources
- [Guide Officiel Write Back](https://airtable.com/developers/extensions/guides/write-back-to-airtable)
- [Documentation Airtable API](https://airtable.com/developers/web/api/introduction)
- [Types de Champs Airtable](https://airtable.com/developers/web/api/field-types)</content>
</xai:function_call</xai:function_call name="write_to_file">
<parameter name="path">AIRTABLE_SETUP.md