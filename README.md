# 📅 Gestionnaire de Congés Personnel

Une application web moderne pour gérer vos congés, RTT et absences de manière simple et efficace.

## ✨ Fonctionnalités

### 🎯 Fonctionnalités principales
- **Gestion des congés** : Ajout, modification et suppression de congés
- **Types de congés** : CP, RTT, Maladie, Sans solde, Formation, Autre
- **Calcul automatique** : Jours ouvrés (excluant weekends et jours fériés)
- **Suivi des soldes** : Visualisation en temps réel des congés restants
- **Historique complet** : Tous vos congés avec filtres et recherche
- **Calendrier visuel** : Vue mensuelle avec les congés colorés
- **Export/Import** : Sauvegarde et restauration de vos données

### 📊 Dashboard intelligent
- Vue d'ensemble des soldes par type de congé
- Statistiques de l'année en cours
- Congés récents et prochains
- Actions rapides

### ⚙️ Paramètres personnalisables
- Quotas annuels par type de congé
- Jours fériés configurables
- Mode sombre/clair
- Notifications

### 📱 Interface responsive
- Design mobile-first
- Navigation intuitive
- Animations fluides
- Accessibilité optimisée

## 🚀 Installation et démarrage

### Prérequis
- Node.js 18+ 
- npm ou yarn

### Installation
```bash
# Cloner le projet
git clone <repository-url>
cd leave-tracker

# Installer les dépendances
npm install

# Lancer en mode développement
npm run dev
```

### Build de production
```bash
# Build statique
npm run build

# Démarrer en production
npm start
```

## 🛠️ Technologies utilisées

### Frontend
- **Next.js 14** : Framework React avec App Router
- **TypeScript** : Typage statique
- **Tailwind CSS** : Framework CSS utilitaire
- **Framer Motion** : Animations
- **Lucide React** : Icônes
- **React Hook Form** : Gestion des formulaires
- **Zod** : Validation des données

### Stockage
- **IndexedDB** : Base de données locale (avec fallback localStorage)
- **idb** : Wrapper pour IndexedDB

### Utilitaires
- **date-fns** : Manipulation des dates
- **react-hot-toast** : Notifications
- **xlsx** : Export Excel
- **papaparse** : Import/Export CSV

## 📁 Structure du projet

```
leave-tracker/
├── src/
│   ├── app/                 # Pages Next.js (App Router)
│   │   ├── page.tsx        # Dashboard principal
│   │   ├── add/            # Ajout de congé
│   │   ├── history/        # Historique
│   │   ├── calendar/       # Calendrier
│   │   ├── settings/       # Paramètres
│   │   ├── layout.tsx      # Layout principal
│   │   └── globals.css     # Styles globaux
│   ├── components/         # Composants réutilisables
│   ├── types/              # Types TypeScript
│   ├── utils/              # Utilitaires
│   │   ├── leaveUtils.ts   # Logique métier
│   │   └── storage.ts      # Gestion du stockage
│   └── hooks/              # Hooks personnalisés
├── public/                 # Assets statiques
├── package.json
├── tailwind.config.js
├── next.config.js
└── README.md
```

## 🎨 Design System

### Couleurs des types de congés
- **CP (Congés Payés)** : Bleu (#3b82f6)
- **RTT** : Vert (#22c55e)
- **Maladie** : Orange (#f59e0b)
- **Sans Solde** : Rouge (#ef4444)
- **Formation** : Violet (#8b5cf6)
- **Autre** : Gris (#6b7280)

### Composants
- **Cards** : Conteneurs avec ombres et bordures
- **Buttons** : Boutons avec états et variantes
- **Forms** : Formulaires avec validation
- **Tables** : Tableaux responsifs
- **Badges** : Étiquettes colorées

## 📊 Fonctionnalités détaillées

### Gestion des congés
1. **Ajout** : Formulaire avec validation des dates
2. **Modification** : Édition des congés existants
3. **Suppression** : Confirmation avant suppression
4. **Validation** : Vérification des chevauchements

### Calcul des jours ouvrés
- Exclusion automatique des weekends
- Exclusion des jours fériés français
- Calcul précis des périodes

### Export/Import
- **Format JSON** : Sauvegarde complète
- **Format CSV** : Compatible Excel
- **Format Excel** : Export direct

### Calendrier
- Vue mensuelle interactive
- Couleurs par type de congé
- Tooltips informatifs
- Navigation fluide

## 🔧 Configuration

### Paramètres par défaut
```typescript
const defaultSettings = {
  firstDayOfWeek: 'monday',
  country: 'FR',
  quotas: [
    { type: 'cp', yearlyQuota: 25 },
    { type: 'rtt', yearlyQuota: 10 },
    { type: 'sick', yearlyQuota: 0 },
    { type: 'unpaid', yearlyQuota: 0 },
    { type: 'training', yearlyQuota: 0 },
    { type: 'other', yearlyQuota: 0 },
  ],
  darkMode: false,
  notifications: true,
}
```

### Jours fériés français
L'application inclut automatiquement les jours fériés français pour 2024 et 2025. Les années suivantes peuvent être ajoutées dans `leaveUtils.ts`.

## 📱 Déploiement

### Vercel (Recommandé)
```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

### GitHub Pages
```bash
# Build statique
npm run build

# Déployer sur GitHub Pages
# Configurer dans Settings > Pages
```

### Autres plateformes
L'application génère un build statique compatible avec :
- Netlify
- Surge
- Firebase Hosting
- Serveur web classique

## 🔒 Sécurité et confidentialité

### Données locales
- **Aucune donnée envoyée** vers des serveurs externes
- **Stockage local** uniquement (IndexedDB/localStorage)
- **Chiffrement** des données sensibles (optionnel)

### Sauvegarde
- **Export automatique** recommandé
- **Sauvegarde cloud** manuelle
- **Restauration** simple depuis fichier

## 🐛 Dépannage

### Problèmes courants

#### IndexedDB non supporté
L'application bascule automatiquement vers localStorage.

#### Données corrompues
```bash
# Réinitialiser les données
localStorage.clear()
# Puis importer une sauvegarde
```

#### Performance lente
- Vérifier l'espace disque
- Nettoyer les anciennes données
- Optimiser les requêtes

## 🤝 Contribution

### Développement
1. Fork le projet
2. Créer une branche feature
3. Commiter les changements
4. Pousser vers la branche
5. Créer une Pull Request

### Standards de code
- **TypeScript strict**
- **ESLint + Prettier**
- **Tests unitaires**
- **Documentation**

## 📄 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🙏 Remerciements

- **Next.js** pour le framework
- **Tailwind CSS** pour le design
- **date-fns** pour la gestion des dates
- **Lucide** pour les icônes

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation
- Vérifier les FAQ

---

**Développé avec ❤️ pour simplifier la gestion des congés**
