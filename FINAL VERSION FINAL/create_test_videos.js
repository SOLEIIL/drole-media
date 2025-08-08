const mongoose = require('mongoose');
const Video = require('./models/Video');
const Category = require('./models/Category');
const User = require('./models/User');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB:', err));

async function createTestVideos() {
  try {
    console.log('🎬 Création de vidéos de test...');
    
    // 1. Créer des catégories de test
    console.log('🏷️ Création des catégories de test...');
    const categories = [];
    
    const categoryNames = ['Humour', 'Musique', 'Sport', 'Technologie', 'Cuisine'];
    
    for (const name of categoryNames) {
      let category = await Category.findOne({ name });
      if (!category) {
        category = new Category({ name });
        await category.save();
        console.log(`✅ Catégorie créée: ${name}`);
      } else {
        console.log(`ℹ️ Catégorie existante: ${name}`);
      }
      categories.push(category);
    }
    
    // 2. Créer un utilisateur de test
    console.log('👤 Création d\'un utilisateur de test...');
    let testUser = await User.findOne({ email: 'test@example.com' });
    if (!testUser) {
      testUser = new User({
        name: 'Utilisateur Test',
        email: 'test@example.com',
        password: 'password123',
        emailVerified: true
      });
      await testUser.save();
      console.log('✅ Utilisateur de test créé');
    } else {
      console.log('ℹ️ Utilisateur de test existant');
    }
    
    // 3. Créer des vidéos de test
    console.log('📹 Création des vidéos de test...');
    const testVideos = [
      {
        title: 'Vidéo Humour 1',
        description: 'Une vidéo drôle',
        s3Url: 'https://example.com/video1.mp4',
        category: categories[0]._id, // Humour
        status: 'validated',
        user: testUser._id
      },
      {
        title: 'Vidéo Musique 1',
        description: 'Une vidéo musicale',
        s3Url: 'https://example.com/video2.mp4',
        category: categories[1]._id, // Musique
        status: 'validated',
        user: testUser._id
      },
      {
        title: 'Vidéo Sport 1',
        description: 'Une vidéo sportive',
        s3Url: 'https://example.com/video3.mp4',
        category: categories[2]._id, // Sport
        status: 'validated',
        user: testUser._id
      },
      {
        title: 'Vidéo Technologie 1',
        description: 'Une vidéo tech',
        s3Url: 'https://example.com/video4.mp4',
        category: categories[3]._id, // Technologie
        status: 'validated',
        user: testUser._id
      },
      {
        title: 'Vidéo Cuisine 1',
        description: 'Une vidéo de cuisine',
        s3Url: 'https://example.com/video5.mp4',
        category: categories[4]._id, // Cuisine
        status: 'validated',
        user: testUser._id
      },
      {
        title: 'Vidéo Humour 2',
        description: 'Une autre vidéo drôle',
        s3Url: 'https://example.com/video6.mp4',
        category: categories[0]._id, // Humour
        status: 'validated',
        user: testUser._id
      }
    ];
    
    for (const videoData of testVideos) {
      const existingVideo = await Video.findOne({ title: videoData.title });
      if (!existingVideo) {
        const video = new Video(videoData);
        await video.save();
        console.log(`✅ Vidéo créée: ${videoData.title} (Catégorie: ${videoData.category})`);
      } else {
        console.log(`ℹ️ Vidéo existante: ${videoData.title}`);
      }
    }
    
    // 4. Afficher les statistiques
    console.log('\n📊 Statistiques finales:');
    const totalVideos = await Video.countDocuments({});
    const videosByCategory = {};
    
    for (const category of categories) {
      const count = await Video.countDocuments({ category: category._id });
      videosByCategory[category.name] = count;
      console.log(`  - ${category.name}: ${count} vidéo(s)`);
    }
    
    console.log(`\n✅ ${totalVideos} vidéos de test créées avec succès !`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la création des vidéos de test:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Connexion MongoDB fermée');
  }
}

createTestVideos();
