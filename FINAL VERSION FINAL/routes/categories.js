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

// Les routes suivantes seront sécurisées par le middleware admin plus tard
// POST /api/admin/categories : ajout catégorie
router.post('/admin', async (req, res) => {
  try {
    const { name } = req.body;
    const category = new Category({ name });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création de la catégorie.' });
  }
});

// DELETE /api/admin/categories/:id : suppression catégorie
router.delete('/admin/:id', async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Catégorie supprimée.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;