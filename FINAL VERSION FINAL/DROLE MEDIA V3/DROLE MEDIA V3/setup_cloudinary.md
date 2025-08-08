# 🔧 Configuration Cloudinary pour Heroku

## 📋 Étapes pour configurer Cloudinary

### 1. Créer un compte Cloudinary
- Allez sur [cloudinary.com](https://cloudinary.com)
- Créez un compte gratuit
- Notez vos identifiants :
  - Cloud Name
  - API Key
  - API Secret

### 2. Configurer les variables d'environnement sur Heroku

Remplacez les valeurs par vos vraies identifiants Cloudinary :

```bash
heroku config:set CLOUDINARY_CLOUD_NAME=votre_cloud_name
heroku config:set CLOUDINARY_API_KEY=votre_api_key
heroku config:set CLOUDINARY_API_SECRET=votre_api_secret
```

### 3. Vérifier la configuration

```bash
heroku config:get CLOUDINARY_CLOUD_NAME
heroku config:get CLOUDINARY_API_KEY
heroku config:get CLOUDINARY_API_SECRET
```

### 4. Déployer l'application

```bash
git add .
git commit -m "Migration vers Cloudinary pour stockage permanent"
git push heroku master
```

### 5. Exécuter la migration (optionnel)

Si vous avez des données existantes à migrer :

```bash
heroku run node migrate_to_cloudinary.js
```

## ✅ Avantages de cette configuration

- **Stockage permanent** : Les fichiers ne sont plus perdus lors des redéploiements
- **Haute disponibilité** : Cloudinary assure une disponibilité de 99.9%
- **CDN global** : Accès rapide depuis n'importe où dans le monde
- **Optimisation automatique** : Images et vidéos optimisées automatiquement
- **Sécurité** : Fichiers protégés et accessibles uniquement via URL signée

## 🚀 Résultat

Après cette configuration, votre application sera :
- ✅ Résistante aux redéploiements Heroku
- ✅ Avec un stockage permanent des fichiers
- ✅ Avec des performances optimisées
- ✅ Avec une haute disponibilité
