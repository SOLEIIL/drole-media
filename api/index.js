const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Route de test simple
app.get('/api/test', (req, res) => {
  res.json({ message: 'API fonctionne !', timestamp: new Date().toISOString() });
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