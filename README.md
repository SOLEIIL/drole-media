# 🎬 DROLE - Site de Partage de Vidéos Francophones

Une plateforme moderne pour découvrir et partager les meilleures vidéos francophones !

## ✨ Fonctionnalités

### 👤 Utilisateurs Normaux
- 📤 **Soumission de vidéos** avec formulaire complet
- 📚 **Bibliothèque** de vidéos approuvées
- 🔍 **Recherche et filtres** par catégorie
- 📧 **Formulaire de contact** accessible sans connexion
- 🌙 **Mode sombre/clair**

### 👨‍💼 Administrateurs
- ✅ **Approbation/rejet** de vidéos soumises
- 👥 **Gestion des utilisateurs** (bannir/débannir)
- 🤝 **Gestion des partenaires** avec images
- 📊 **Statistiques** détaillées
- 🎛️ **Panel admin** complet

## 🚀 Déploiement sur Vercel

### Prérequis
- Compte Vercel (gratuit)
- Base de données MongoDB (MongoDB Atlas recommandé)

### Étapes de déploiement

1. **Fork/Clone le projet**
   ```bash
   git clone [URL_DU_REPO]
   cd FINAL-VERSION-FINAL
   ```

2. **Variables d'environnement**
   Dans Vercel, configurez ces variables :
   - `MONGODB_URI` : Votre URI MongoDB Atlas
   - `JWT_SECRET` : Clé secrète pour les tokens JWT

3. **Déploiement**
   ```bash
   # Installer Vercel CLI
   npm i -g vercel
   
   # Déployer
   vercel
   ```

## 🛠️ Installation Locale

```bash
# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env

# Configurer les variables d'environnement
MONGODB_URI=mongodb://localhost:27017/drole
JWT_SECRET=votre_secret_jwt

# Démarrer le serveur
npm start
```

## 📁 Structure du Projet

```
FINAL VERSION FINAL/
├── models/          # Modèles MongoDB
├── routes/          # Routes API
├── public/          # Interface utilisateur
├── uploads/         # Fichiers uploadés
├── server.js        # Serveur principal
├── vercel.json      # Configuration Vercel
└── package.json     # Dépendances
```

## 🔧 Technologies Utilisées

- **Backend** : Node.js, Express, MongoDB
- **Frontend** : HTML5, CSS3, JavaScript vanilla
- **Authentification** : JWT
- **Upload** : Multer
- **Déploiement** : Vercel

## 📞 Support

Pour toute question ou problème, contactez-nous via le formulaire de contact du site.

---

**DROLE** - Découvrez et partagez les meilleures vidéos Francophones ! 🇫🇷 