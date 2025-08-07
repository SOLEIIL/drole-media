const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Connexion MongoDB avec gestion d'erreur
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/drole', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'))
  .catch((err) => {
    console.error('Erreur MongoDB:', err);
    // Ne pas faire planter l'app si MongoDB n'est pas disponible
  });

// Routes API
const videosRoutes = require('../routes/videos');
const categoriesRoutes = require('../routes/categories');
const adminRoutes = require('../routes/admin');
const usersRoutes = require('../routes/users');
const partnersRoutes = require('../routes/partners');
const authRoutes = require('../routes/auth');

app.use('/api/videos', videosRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/partners', partnersRoutes);
app.use('/api/auth', authRoutes);

// Route de test
app.get('/api/test', (req, res) => {
  res.json({ message: 'API fonctionne !' });
});

// Route pour servir l'application front-end
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Gestion d'erreur globale
app.use((err, req, res, next) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

module.exports = app; 