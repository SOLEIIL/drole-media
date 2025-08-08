require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('./models/Video');
const Category = require('./models/Category');

async function cleanupDatabase() {
    try {
        // Connexion à MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connecté à MongoDB');
        
        // Supprimer toutes les vidéos
        const deletedVideos = await Video.deleteMany({});
        console.log(`🗑️  ${deletedVideos.deletedCount} vidéo(s) supprimée(s)`);
        
        // Supprimer toutes les catégories
        const deletedCategories = await Category.deleteMany({});
        console.log(`🗑️  ${deletedCategories.deletedCount} catégorie(s) supprimée(s)`);
        
        console.log('✅ Base de données nettoyée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur lors du nettoyage:', error);
    } finally {
        await mongoose.disconnect();
        console.log('✅ Déconnecté de MongoDB');
    }
}

cleanupDatabase();
