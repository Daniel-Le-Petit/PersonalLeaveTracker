# 📅 Leave Tracker - Gestionnaire de Congés

Application de gestion des congés personnelle avec suivi des RTT, congés payés et reliquats.

## 🚀 Déploiement sur Render

### Configuration Actuelle

L'application est configurée pour être déployée sur Render avec les caractéristiques suivantes :

- **Type de déploiement** : Web Service
- **Build Command** : `npm install && npm run build`
- **Start Command** : `npm start`
- **Port** : 10000
- **Environnement** : Production

### ⚠️ Important : IndexedDB et Persistance des Données

**Cette application utilise IndexedDB pour le stockage local des données.**

#### Avantages :
- ✅ Fonctionne hors ligne
- ✅ Données persistantes dans le navigateur
- ✅ Performance rapide
- ✅ Pas de serveur de base de données requis

#### Limitations :
- ❌ Données stockées localement uniquement
- ❌ Pas de synchronisation entre appareils
- ❌ Perte possible si données du navigateur effacées
- ❌ Pas de sauvegarde automatique côté serveur

### 📋 Instructions de Déploiement

1. **Préparer le déploiement** :
   ```bash
   ./deploy.sh
   ```

2. **Pousser le code vers GitHub** :
   ```bash
   git add .
   git commit -m "Prepare for Render deployment"
   git push origin main
   ```

3. **Déployer sur Render** :
   - Aller sur [render.com](https://render.com)
   - Connecter le repository GitHub
   - Sélectionner "Web Service"
   - Utiliser la configuration de `render.yaml`

### 🔄 Gestion des Données

#### Pour les Utilisateurs :
- **Export régulier** : Utilisez la fonction d'export pour sauvegarder vos données
- **Import** : Importez vos données existantes si nécessaire
- **Sauvegarde multiple** : Gardez plusieurs fichiers de sauvegarde

#### Fonctionnalités de Sauvegarde :
- Export automatique vers localStorage
- Export manuel en fichier JSON
- Import depuis fichier JSON
- Sauvegardes multiples avec dates

### 🛠️ Développement Local

```bash
# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev

# Lancer sur un port spécifique
PORT=3001 npm run dev

# Build pour production
npm run build

# Lancer en mode production
npm start
```

### 📊 Fonctionnalités

- **Dashboard** : Vue d'ensemble des congés et soldes
- **Ajout de congés** : Interface intuitive pour ajouter des congés
- **Historique** : Liste complète des congés pris
- **Calendrier** : Vue calendrier des congés
- **Reliquats** : Gestion des congés reportés
- **Tableau mensuel** : Suivi détaillé par mois avec cumuls
- **Graphiques** : Visualisation des données de congés
- **Export/Import** : Sauvegarde et restauration des données

### 🔧 Technologies Utilisées

- **Frontend** : Next.js 14, React 18, TypeScript
- **Styling** : Tailwind CSS
- **Base de données** : IndexedDB (client-side)
- **Déploiement** : Render
- **Gestion des dates** : date-fns
- **UI Components** : Lucide React, React Hot Toast

### 📱 Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (versions récentes)
- **IndexedDB** : Supporté dans tous les navigateurs modernes
- **Responsive** : Optimisé pour desktop et mobile

### 🚨 Recommandations

1. **Sauvegarde régulière** : Exportez vos données au moins une fois par semaine
2. **Navigateur unique** : Utilisez le même navigateur pour éviter la perte de données
3. **Test d'import** : Testez régulièrement la fonction d'import
4. **Sauvegarde multiple** : Gardez plusieurs copies de vos données

### 🔮 Évolutions Futures

- [ ] Synchronisation cloud (Google Drive, Dropbox)
- [ ] Backend API avec base de données
- [ ] Authentification utilisateur
- [ ] Synchronisation multi-appareils
- [ ] Application mobile

### 📞 Support

Pour toute question concernant :
- **Déploiement** : Consultez `DEPLOYMENT.md`
- **Développement** : Consultez la documentation des technologies utilisées
- **Données** : Utilisez les fonctions d'export/import intégrées

---

**Note importante** : Cette application est conçue pour un usage personnel. Les données sont stockées localement et ne sont pas synchronisées avec un serveur. Assurez-vous de sauvegarder régulièrement vos données.
