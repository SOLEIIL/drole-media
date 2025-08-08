const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET /api/categories : liste publique
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories.' });
  }
});

module.exports = router;