const mongoose = require('mongoose');
const Category = require('./models/Category');
const Video = require('./models/Video');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB:', err));

async function testCategoryDeletion() {
  try {
    console.log('🗑️ Test de suppression de catégorie avec vidéos...');
    
    // 1. Trouver une catégorie avec des vidéos
    const categories = await Category.find({});
    let categoryToDelete = null;
    
    for (const category of categories) {
      const videoCount = await Video.countDocuments({ category: category._id });
      if (videoCount > 0) {
        categoryToDelete = category;
        console.log(`🎯 Catégorie sélectionnée pour suppression: "${category.name}" avec ${videoCount} vidéo(s)`);
        break;
      }
    }
    
    if (!categoryToDelete) {
      console.log('❌ Aucune catégorie avec des vidéos trouvée');
      return;
    }
    
    // 2. Afficher les vidéos avant suppression
    console.log('\n📹 Vidéos avant suppression:');
    const videosBefore = await Video.find({ category: categoryToDelete._id });
    videosBefore.forEach(video => {
      console.log(`  - ${video.title}`);
    });
    
    // 3. Simuler la suppression (sans vraiment supprimer)
    console.log(`\n⚠️ Simulation de suppression de la catégorie "${categoryToDelete.name}"...`);
    console.log(`📊 ${videosBefore.length} vidéo(s) seraient mises à jour (catégorie retirée)`);
    
    // 4. Vérifier ce qui se passerait
    console.log('\n🔍 Analyse de ce qui se passerait:');
    console.log(`  - La catégorie "${categoryToDelete.name}" serait supprimée`);
    console.log(`  - ${videosBefore.length} vidéo(s) auraient leur catégorie retirée`);
    console.log(`  - Les vidéos deviendraient "sans catégorie"`);
    
    // 5. Vérifier les autres catégories
    console.log('\n📊 Autres catégories qui resteraient:');
    for (const category of categories) {
      if (category._id.toString() !== categoryToDelete._id.toString()) {
        const videoCount = await Video.countDocuments({ category: category._id });
        console.log(`  - ${category.name}: ${videoCount} vidéo(s)`);
      }
    }
    
    console.log('\n✅ Test de suppression terminé !');
    console.log('💡 Pour une vraie suppression, utilisez l\'interface admin ou l\'API');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

testCategoryDeletion();
