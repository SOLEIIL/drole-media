# 🚀 DROLE MEDIA V1 - Démarrage Rapide

## ⚡ **Démarrage en 5 minutes**

### 1. **Installation**
```bash
cd "DROLE MEDIA V1"
npm install
```

### 2. **Configuration**
Créer `.env` :
```env
MONGODB_URI=mongodb://localhost:27017/drole_media
JWT_SECRET=votre_secret_jwt_super_securise
EMAIL_USER=votre_email@gmail.com
EMAIL_PASS=votre_mot_de_passe_app
CLOUDINARY_CLOUD_NAME=votre_cloud_name
CLOUDINARY_API_KEY=votre_api_key
CLOUDINARY_API_SECRET=votre_api_secret
BASE_URL=http://localhost:5000
PORT=5000
```

### 3. **Démarrage**
```bash
npm start
```

### 4. **Accès**
- **Site** : http://localhost:5000
- **Admin** : admin@kghmedia.com / admin123
- **User** : user@test.com / user123

## 🎯 **Fonctionnalités Clés**

✅ **Authentification complète** (inscription, connexion, vérification email)
✅ **Upload vidéos** avec Cloudinary
✅ **Dashboard admin** (modération, gestion utilisateurs)
✅ **Système de bannissement** des utilisateurs
✅ **Interface responsive** Bootstrap 5
✅ **Sécurité renforcée** (JWT, rate limiting, validation)

## 📁 **Structure du Projet**

```
DROLE MEDIA V1/
├── models/          # Schémas MongoDB
├── routes/          # API REST
├── public/          # Frontend
├── uploads/         # Fichiers uploadés
├── server.js        # Serveur principal
├── package.json     # Dépendances
└── README.md        # Documentation complète
```

## 🔧 **Déploiement Heroku**

```bash
heroku create votre-app-name
heroku config:set MONGODB_URI=votre_uri
heroku config:set JWT_SECRET=votre_secret
# ... autres variables
git push heroku master
```

## 📞 **Support**

- **Documentation complète** : `README.md`
- **Instructions détaillées** : `INSTRUCTIONS_UTILISATION.md`
- **Historique** : `CHANGELOG.md`

---

**✅ Projet prêt pour la production !**
