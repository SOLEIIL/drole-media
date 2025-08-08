# 📁 DROLE MEDIA V1 - Instructions d'Utilisation

## 🎯 **Vue d'ensemble**

Cette sauvegarde contient la version finale complète du projet DROLE MEDIA, une plateforme de partage de vidéos avec système d'authentification, gestion des utilisateurs et modération administrative.

## 📋 **Contenu de la Sauvegarde**

### **Fichiers Principaux**
- `server.js` - Serveur Express principal
- `package.json` - Dépendances Node.js
- `Procfile` - Configuration Heroku
- `README.md` - Documentation complète
- `CHANGELOG.md` - Historique des modifications

### **Dossiers**
- `models/` - Schémas MongoDB (User, Video, Category, Partner, Admin)
- `routes/` - API REST (auth, videos, users, admin, categories, partners)
- `public/` - Frontend (HTML, CSS, JavaScript)
- `uploads/` - Fichiers uploadés (partenaires)
- `node_modules/` - Dépendances installées

### **Scripts Utilitaires**
- `cleanup_database.js` - Nettoyer la base de données
- `reset_categories.js` - Réinitialiser les catégories
- `migrate_to_cloudinary.js` - Migration vers Cloudinary
- `check_user.js` - Vérifier un utilisateur
- `verify_user.js` - Vérifier manuellement un utilisateur

## 🚀 **Comment Utiliser cette Sauvegarde**

### **1. Installation Locale**

```bash
# 1. Copier le dossier où vous voulez
# 2. Ouvrir un terminal dans le dossier
cd "DROLE MEDIA V1"

# 3. Installer les dépendances (si pas déjà fait)
npm install

# 4. Créer un fichier .env avec vos variables d'environnement
```

### **2. Configuration des Variables d'Environnement**

Créer un fichier `.env` avec :

```env
# Base de données
MONGODB_URI=mongodb://localhost:27017/drole_media

# JWT Secret
JWT_SECRET=votre_secret_jwt_super_securise

# Email (Gmail)
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app

# Cloudinary
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret

# URL de base
BASE_URL=http://localhost:5000

# Port
PORT=5000
```

### **3. Démarrage Local**

```bash
# Démarrer le serveur
npm start

# Ou en mode développement
npm run dev
```

### **4. Déploiement sur Heroku**

```bash
# 1. Créer une app Heroku
heroku create votre-app-name

# 2. Configurer les variables d'environnement
heroku config:set MONGODB_URI=votre_mongodb_uri
heroku config:set JWT_SECRET=votre_secret_jwt
heroku config:set EMAIL_USER=votre_email@gmail.com
heroku config:set EMAIL_PASS=votre_mot_de_passe_app
heroku config:set CLOUDINARY_CLOUD_NAME=votre_cloud_name
heroku config:set CLOUDINARY_API_KEY=votre_api_key
heroku config:set CLOUDINARY_API_SECRET=votre_api_secret
heroku config:set BASE_URL=https://votre-app-name.herokuapp.com

# 3. Déployer
git init
git add .
git commit -m "Initial commit"
git push heroku master
```

## 🔧 **Fonctionnalités Principales**

### **Authentification**
- ✅ Inscription avec vérification email
- ✅ Connexion sécurisée
- ✅ Mot de passe oublié
- ✅ Validation de force du mot de passe

### **Gestion des Vidéos**
- ✅ Upload avec Cloudinary
- ✅ Modération par les admins
- ✅ Système de copyright
- ✅ Catégorisation

### **Dashboard Admin**
- ✅ Gestion des utilisateurs (bannir/débannir)
- ✅ Modération des vidéos
- ✅ Gestion des catégories
- ✅ Gestion des partenaires

### **Sécurité**
- ✅ JWT tokens
- ✅ Hachage des mots de passe
- ✅ Protection CSRF
- ✅ Rate limiting

## 📊 **Comptes de Test**

### **Administrateur**
- Email: `admin@kghmedia.com`
- Mot de passe: `admin123`

### **Utilisateur Normal**
- Email: `user@test.com`
- Mot de passe: `user123`

## 🛠️ **Scripts Utilitaires**

### **Nettoyer la Base de Données**
```bash
node cleanup_database.js
```

### **Réinitialiser les Catégories**
```bash
node reset_categories.js
```

### **Vérifier un Utilisateur**
```bash
node check_user.js
```

### **Migration vers Cloudinary**
```bash
node migrate_to_cloudinary.js
```

## 🔍 **Dépannage**

### **Problèmes Courants**

1. **Erreur de connexion MongoDB**
   - Vérifier `MONGODB_URI` dans `.env`
   - S'assurer que MongoDB est accessible

2. **Erreur d'envoi d'email**
   - Vérifier `EMAIL_USER` et `EMAIL_PASS`
   - Utiliser un mot de passe d'application Gmail

3. **Erreur Cloudinary**
   - Vérifier les credentials Cloudinary
   - S'assurer que le compte est actif

4. **Erreur JWT**
   - Vérifier `JWT_SECRET` dans `.env`
   - Utiliser un secret fort et unique

## 📝 **Notes Importantes**

- **Sécurité** : Tous les secrets sont maintenant dans les variables d'environnement
- **Performance** : Optimisé pour Heroku avec compression et caching
- **Scalabilité** : Prêt pour la production avec gestion d'erreurs robuste
- **Maintenance** : Code modulaire et bien documenté

## 🎉 **Statut du Projet**

**✅ VERSION FINALE TERMINÉE ET OPÉRATIONNELLE**

Toutes les fonctionnalités demandées ont été implémentées et testées avec succès. Le projet est prêt pour la production.

---

**Développé avec ❤️ pour DROLE-Media**
*Version Finale - Août 2025*
