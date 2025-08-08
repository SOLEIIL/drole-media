const mongoose = require('mongoose');
const Category = require('./models/Category');
const Video = require('./models/Video');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB:', err));

async function testCategories() {
  try {
    console.log('🧪 Test de la gestion des catégories...');
    
    // 1. Lister toutes les catégories
    console.log('\n📊 Catégories existantes:');
    const categories = await Category.find({});
    console.log(`✅ ${categories.length} catégories trouvées:`);
    categories.forEach(cat => {
      console.log(`  - ${cat._id}: ${cat.name}`);
    });
    
    // 2. Compter les vidéos par catégorie
    console.log('\n📹 Vidéos par catégorie:');
    for (const category of categories) {
      const videoCount = await Video.countDocuments({ category: category._id });
      console.log(`  - ${category.name}: ${videoCount} vidéo(s)`);
    }
    
    // 3. Vérifier les vidéos sans catégorie
    const videosWithoutCategory = await Video.countDocuments({ category: { $exists: false } });
    console.log(`\n📹 Vidéos sans catégorie: ${videosWithoutCategory}`);
    
    // 4. Vérifier les vidéos avec catégorie null
    const videosWithNullCategory = await Video.countDocuments({ category: null });
    console.log(`📹 Vidéos avec catégorie null: ${videosWithNullCategory}`);
    
    console.log('\n✅ Test terminé !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

testCategories();
