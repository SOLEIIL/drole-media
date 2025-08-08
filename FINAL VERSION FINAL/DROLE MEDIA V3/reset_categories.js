require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('./models/Category');

async function resetCategories() {
    try {
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connecté à MongoDB');
        
        // Supprimer toutes les catégories existantes
        const deleted = await Category.deleteMany({});
        console.log(`🗑️  ${deleted.deletedCount} catégorie(s) supprimée(s)`);
        
        // Créer des catégories par défaut
        const defaultCategories = [
            { name: 'Humour', description: 'Vidéos drôles et comiques' },
            { name: 'Fail', description: 'Chutes et échecs amusants' },
            { name: 'Animaux', description: 'Vidéos d\'animaux mignons' },
            { name: 'Sport', description: 'Moments sportifs incroyables' },
            { name: 'Musique', description: 'Performances musicales' }
        ];
        
        for (const cat of defaultCategories) {
            const category = new Category(cat);
            await category.save();
            console.log(`✅ Catégorie créée: ${cat.name}`);
        }
        
        console.log('✅ Catégories réinitialisées avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Déconnecté de MongoDB');
    }
}

resetCategories();
