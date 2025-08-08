const mongoose = require('mongoose');
const Category = require('./models/Category');
const Video = require('./models/Video');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB:', err));

async function testCategoryManagement() {
  try {
    console.log('🧪 Test de la gestion complète des catégories...');
    
    // 1. Lister toutes les catégories avec statistiques
    console.log('\n📊 Catégories existantes avec statistiques:');
    const categories = await Category.find({});
    
    for (const category of categories) {
      const videoCount = await Video.countDocuments({ category: category._id });
      console.log(`  - ${category.name} (ID: ${category._id}): ${videoCount} vidéo(s)`);
    }
    
    // 2. Simuler la modification d'une catégorie
    if (categories.length > 0) {
      const testCategory = categories[0];
      console.log(`\n🔧 Test de modification de la catégorie "${testCategory.name}"...`);
      
      const oldName = testCategory.name;
      const newName = `${oldName}_modifié_${Date.now()}`;
      
      // Simuler la modification
      const updatedCategory = await Category.findByIdAndUpdate(
        testCategory._id,
        { name: newName },
        { new: true }
      );
      
      console.log(`✅ Catégorie modifiée: "${oldName}" → "${newName}"`);
      
      // Vérifier les vidéos qui utilisent cette catégorie
      const videosUsingCategory = await Video.find({ category: testCategory._id });
      console.log(`📹 ${videosUsingCategory.length} vidéo(s) utilisent cette catégorie`);
      
      // Remettre l'ancien nom pour le test
      await Category.findByIdAndUpdate(
        testCategory._id,
        { name: oldName },
        { new: true }
      );
      console.log(`🔄 Nom remis à "${oldName}" pour le test`);
    }
    
    // 3. Simuler la suppression d'une catégorie
    if (categories.length > 0) {
      const testCategory = categories[0];
      console.log(`\n🗑️ Test de suppression de la catégorie "${testCategory.name}"...`);
      
      // Vérifier les vidéos avant suppression
      const videosBeforeDelete = await Video.find({ category: testCategory._id });
      console.log(`📹 ${videosBeforeDelete.length} vidéo(s) utilisent cette catégorie avant suppression`);
      
      // Simuler la suppression (sans vraiment supprimer pour le test)
      console.log(`⚠️ Simulation de suppression - ${videosBeforeDelete.length} vidéo(s) seraient mises à jour`);
      
      if (videosBeforeDelete.length > 0) {
        console.log(`✅ Les vidéos auraient leur catégorie retirée automatiquement`);
      }
    }
    
    // 4. Statistiques finales
    console.log('\n📊 Statistiques finales:');
    const totalVideos = await Video.countDocuments({});
    const videosWithCategory = await Video.countDocuments({ category: { $exists: true, $ne: null } });
    const videosWithoutCategory = totalVideos - videosWithCategory;
    
    console.log(`  - Total vidéos: ${totalVideos}`);
    console.log(`  - Vidéos avec catégorie: ${videosWithCategory}`);
    console.log(`  - Vidéos sans catégorie: ${videosWithoutCategory}`);
    
    console.log('\n✅ Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

testCategoryManagement();
