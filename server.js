require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

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

// Route pour servir l'application front-end (uniquement pour les routes qui ne sont pas /api ou /uploads)
app.get(/^\/(?!api|uploads).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

// Export pour Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur le port ${PORT}`);
    console.log(`Front-end disponible sur http://localhost:${PORT}`);
  });
}

module.exports = app;