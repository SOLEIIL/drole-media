# DROLE MEDIA V3 - Instructions d'Utilisation

## 🚀 **Guide d'Utilisation Complet**

### 📧 **Formulaire de Contact**

#### **Pour les Utilisateurs**
1. **Accéder au formulaire** : Cliquer sur "Contact" dans le menu
2. **Remplir les champs** :
   - **Nom** : Votre nom complet
   - **Email** : Votre adresse email
   - **Sujet** : Sujet de votre message
   - **Message** : Votre message détaillé
3. **Envoyer** : Cliquer sur "Envoyer le message"
4. **Confirmation** : Message de succès s'affiche

#### **Pour l'Administrateur**
- **Réception** : Tous les messages arrivent sur `u0072585458@gmail.com`
- **Template** : Email HTML professionnel avec toutes les informations
- **Logs** : Monitoring complet dans les logs Heroku

### 🔧 **Configuration Technique**

#### **Variables d'Environnement Heroku**
```bash
EMAIL_USER=u0072585458@gmail.com
EMAIL_PASS=hypo xuca tnjq xajb
JWT_SECRET=votre_jwt_secret
MONGODB_URI=votre_mongodb_uri
```

#### **Test du Système Email**
```bash
# Vérifier les logs Heroku
heroku logs --tail

# Tester l'envoi d'email
# Utiliser le formulaire de contact sur le site
```

### 📱 **Interface Utilisateur**

#### **Informations de Contact Mises à Jour**
- **Email** : `u0072585458@gmail.com`
- **Instagram** : `https://www.instagram.com/drole`
- **TikTok** : `https://www.tiktok.com/@drole`

#### **Fonctionnalités Disponibles**
1. **Inscription/Connexion** utilisateurs
2. **Upload de vidéos** avec validation
3. **Dashboard administrateur** complet
4. **Gestion des utilisateurs** (bannir/débannir)
5. **Gestion des catégories** (ajouter/modifier/supprimer)
6. **Formulaire de contact** fonctionnel
7. **Envoi d'emails** automatique

### 🛠️ **Maintenance et Monitoring**

#### **Logs de Monitoring**
```bash
# Voir les logs en temps réel
heroku logs --tail

# Voir les logs d'email spécifiquement
heroku logs --tail | grep "Email"
```

#### **Tests de Fonctionnalité**
1. **Test du formulaire de contact**
2. **Vérification de la réception d'emails**
3. **Test des liens sociaux**
4. **Vérification de l'interface responsive**

### 🔒 **Sécurité**

#### **Protection des Données**
- Variables d'environnement pour les secrets
- Validation côté serveur
- Protection CSRF
- Headers de sécurité

#### **Gestion des Erreurs**
- Logs détaillés pour debugging
- Messages d'erreur appropriés
- Gestion des exceptions
- Monitoring en production

### 📊 **Statistiques et Performance**

#### **Monitoring**
- **Site web** : `https://www.drolemedia.com`
- **Heroku app** : `https://drole-media-app-2a7429d02317.herokuapp.com`
- **Version** : v173 (dernière version stable)

#### **Métriques**
- Temps de réponse des API
- Taux de succès des emails
- Utilisation des ressources
- Erreurs et exceptions

### 🎯 **Troubleshooting**

#### **Problèmes Courants**

**1. Email non reçu**
- Vérifier les logs Heroku
- Contrôler les variables d'environnement
- Tester la configuration SMTP

**2. Formulaire ne fonctionne pas**
- Vérifier la console du navigateur
- Contrôler les logs du serveur
- Tester la validation des champs

**3. Interface ne s'affiche pas correctement**
- Vider le cache du navigateur
- Vérifier la version de l'app.js
- Contrôler les ressources CSS/JS

#### **Solutions**

**1. Redémarrage de l'application**
```bash
heroku restart
```

**2. Vérification des variables d'environnement**
```bash
heroku config
```

**3. Test de l'envoi d'email**
```bash
# Utiliser le formulaire de contact
# Vérifier les logs pour confirmation
```

### 📚 **Documentation Complète**

#### **Fichiers de Documentation**
- `README.md` : Documentation générale
- `CHANGELOG.md` : Historique des versions
- `RESUME_FINAL_V3.md` : Résumé de la V3
- `INSTRUCTIONS_UTILISATION_V3.md` : Ce guide

#### **Structure du Projet**
```
DROLE MEDIA V3/
├── 📧 Contact Form System
├── 📧 Email Configuration
├── 📱 Interface Updates
└── 📚 Documentation
```

### 🎉 **Statut Final**

**✅ PROJET COMPLÈTEMENT FONCTIONNEL**

- Toutes les fonctionnalités demandées implémentées
- Tests de validation réussis
- Déploiement en production stable
- Documentation complète

### 📞 **Support**

Pour toute question ou problème :
- **Email** : `u0072585458@gmail.com`
- **Logs** : `heroku logs --tail`
- **Documentation** : Fichiers dans le projet

---

**DROLE MEDIA V3 - Guide d'Utilisation**
**Version V3 - 8 Août 2025**

