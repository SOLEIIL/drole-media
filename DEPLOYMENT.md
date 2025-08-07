# 🚀 Guide de Déploiement sur Vercel

## 📋 Prérequis

1. **Compte Vercel** (gratuit) : [vercel.com](https://vercel.com)
2. **Base de données MongoDB** : [MongoDB Atlas](https://mongodb.com/atlas) (gratuit)
3. **GitHub/GitLab** pour héberger le code

## 🔧 Configuration MongoDB Atlas

### 1. Créer un cluster MongoDB Atlas
1. Allez sur [MongoDB Atlas](https://mongodb.com/atlas)
2. Créez un compte gratuit
3. Créez un nouveau cluster (gratuit)
4. Configurez l'accès réseau (0.0.0.0/0 pour le développement)

### 2. Créer un utilisateur de base de données
1. Dans Atlas, allez dans "Database Access"
2. Créez un nouvel utilisateur avec mot de passe
3. Donnez les permissions "Read and write to any database"

### 3. Obtenir l'URI de connexion
1. Dans Atlas, cliquez sur "Connect"
2. Choisissez "Connect your application"
3. Copiez l'URI (format : `mongodb+srv://username:password@cluster.mongodb.net/database`)

## 🚀 Déploiement sur Vercel

### Méthode 1 : Via l'interface web Vercel

1. **Connectez votre repository**
   - Allez sur [vercel.com](https://vercel.com)
   - Connectez votre compte GitHub/GitLab
   - Importez votre repository

2. **Configurez les variables d'environnement**
   - Dans les paramètres du projet Vercel
   - Ajoutez ces variables :
     ```
     MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/drole
     JWT_SECRET=votre_secret_jwt_super_securise
     ```

3. **Déployez**
   - Vercel détectera automatiquement que c'est un projet Node.js
   - Le déploiement se fera automatiquement

### Méthode 2 : Via Vercel CLI

1. **Installer Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Se connecter à Vercel**
   ```bash
   vercel login
   ```

3. **Déployer**
   ```bash
   vercel
   ```

4. **Configurer les variables d'environnement**
   ```bash
   vercel env add MONGODB_URI
   vercel env add JWT_SECRET
   ```

## 🔍 Vérification du Déploiement

### 1. Test de l'API
```bash
curl https://votre-projet.vercel.app/api/test
```

### 2. Test de l'interface
- Ouvrez votre URL Vercel
- Testez la navigation
- Testez l'upload de vidéos
- Testez l'authentification

## 🛠️ Dépannage

### Problème : Erreur MongoDB
- Vérifiez que l'URI MongoDB est correct
- Vérifiez que l'utilisateur a les bonnes permissions
- Vérifiez que l'IP est autorisée dans Atlas

### Problème : Erreur JWT
- Vérifiez que JWT_SECRET est défini
- Utilisez une clé secrète forte

### Problème : Uploads ne fonctionnent pas
- Vercel a des limitations pour les uploads
- Considérez utiliser un service externe (AWS S3, Cloudinary)

## 📊 Monitoring

### Logs Vercel
- Allez dans votre dashboard Vercel
- Section "Functions" pour voir les logs

### MongoDB Atlas
- Dashboard Atlas pour surveiller la base de données
- Métriques de performance

## 🔒 Sécurité

### Variables d'environnement
- Ne jamais commiter `.env` dans git
- Utilisez des clés secrètes fortes
- Changez les mots de passe par défaut

### Base de données
- Limitez l'accès réseau dans Atlas
- Utilisez des utilisateurs avec permissions minimales
- Activez l'authentification à deux facteurs

## 📈 Optimisations

### Performance
- Utilisez un CDN pour les fichiers statiques
- Optimisez les images
- Minimisez le JavaScript

### Coûts
- Vercel gratuit : 100GB bandwidth/mois
- MongoDB Atlas gratuit : 512MB storage
- Surveillez l'utilisation

---

**🎉 Votre site DROLE est maintenant en ligne !**

URL : `https://votre-projet.vercel.app` 