require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cloudinary = require('cloudinary').v2;

const app = express();

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

// Configuration pour Heroku (proxy)
app.set('trust proxy', 1);

// Sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      mediaSrc: ["'self'", "https://res.cloudinary.com"],
      connectSrc: ["'self'", "https://res.cloudinary.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  }
}));

// Rate limiting configuré pour Heroku (augmenté pour éviter les blocages)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limite chaque IP à 1000 requêtes par fenêtre (augmenté de 100 à 1000)
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: true,
  skipSuccessfulRequests: true, // Ne pas compter les requêtes réussies
  skipFailedRequests: false // Compter les requêtes échouées
});
app.use(limiter);

// CORS configuré pour la production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir les fichiers statiques (front-end)
app.use(express.static(path.join(__dirname, 'public')));

// Servir les fichiers uploadés (vidéos)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'))
  .catch((err) => console.error('Erreur MongoDB:', err));

// Routes API
const videosRoutes = require('./routes/videos');
const categoriesRoutes = require('./routes/categories');
const adminRoutes = require('./routes/admin');
const usersRoutes = require('./routes/users');
const partnersRoutes = require('./routes/partners');
const authRoutes = require('./routes/auth');

app.use('/api/videos', videosRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/auth', authRoutes);

// Log des routes pour debug
console.log('Routes chargées:');
console.log('- /api/videos');
console.log('- /api/categories');
console.log('- /api/admin');
console.log('- /api/users');
console.log('- /api/partners');
console.log('- /api/auth');

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ message: 'API fonctionne !' });
});

// Route spécifique pour la page de réinitialisation de mot de passe
app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reset-password.html'));
});

// Route spécifique pour la page de vérification d'email avec vérification automatique
app.get('/verify-email', async (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    // Si pas de token, afficher la page normale
    return res.sendFile(path.join(__dirname, 'public', 'verify-email.html'));
  }
  
  try {
    // Vérifier le token directement côté serveur
    const User = require('./models/User');
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() }
    });
    
    if (!user) {
      // Vérifier si le token a expiré
      const expiredUser = await User.findOne({ emailVerificationToken: token });
      if (expiredUser) {
        // Supprimer l'utilisateur expiré
        await User.findByIdAndDelete(expiredUser._id);
        return res.redirect('/?verification=expired');
      }
      return res.redirect('/?verification=invalid');
    }
    
    // Marquer l'utilisateur comme vérifié
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();
    
    console.log('✅ Email vérifié automatiquement pour:', user.email);
    
    // Rediriger vers la page d'accueil avec un message de succès
    res.redirect('/?verification=success');
    
  } catch (error) {
    console.error('Erreur lors de la vérification automatique:', error);
    res.redirect('/?verification=error');
  }
});

// Route pour servir l'application front-end (uniquement pour les routes qui ne sont pas /api ou /uploads)
app.get(/^\/(?!api|uploads).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur le port ${PORT}`);
  console.log(`Front-end disponible sur http://localhost:${PORT}`);
});