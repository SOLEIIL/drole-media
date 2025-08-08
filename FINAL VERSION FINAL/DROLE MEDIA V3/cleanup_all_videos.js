const mongoose = require('mongoose');
const Video = require('./models/Video');
const Category = require('./models/Category');
const fs = require('fs');
const path = require('path');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB:', err));

async function cleanupAllVideos() {
  try {
    console.log('🧹 Début du nettoyage complet des vidéos...');
    
    // 1. Supprimer toutes les vidéos de la base de données
    console.log('📊 Suppression des vidéos de la base de données...');
    const deleteResult = await Video.deleteMany({});
    console.log(`✅ ${deleteResult.deletedCount} vidéos supprimées de la base de données`);
    
    // 2. Nettoyer le dossier uploads
    console.log('📁 Nettoyage du dossier uploads...');
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedFiles = 0;
      
      for (const file of files) {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.isFile()) {
          fs.unlinkSync(filePath);
          deletedFiles++;
          console.log(`🗑️ Fichier supprimé: ${file}`);
        }
      }
      
      console.log(`✅ ${deletedFiles} fichiers supprimés du dossier uploads`);
    } else {
      console.log('ℹ️ Dossier uploads non trouvé');
    }
    
    // 3. Vérifier les catégories et les nettoyer si nécessaire
    console.log('🏷️ Vérification des catégories...');
    const categories = await Category.find({});
    console.log(`📊 ${categories.length} catégories trouvées`);
    
    // 4. Compter les vidéos restantes
    const remainingVideos = await Video.countDocuments({});
    console.log(`📊 Vidéos restantes dans la base: ${remainingVideos}`);
    
    console.log('✅ Nettoyage terminé avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

cleanupAllVideos();
