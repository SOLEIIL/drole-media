// Fichier API pour Vercel
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

// Import du serveur Express
const app = require('../server.js');

// Export pour Vercel
module.exports = app; 