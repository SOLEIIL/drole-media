require('dotenv').config();
const mongoose = require('mongoose');

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('✅ MongoDB connecté'))
  .catch((err) => console.error('❌ Erreur MongoDB:', err));

// Modèles
const Video = require('./models/Video');

async function cleanupBrokenVideos() {
  console.log('🧹 Nettoyage des vidéos avec URLs cassées...');
  
  try {
    const videos = await Video.find({});
    console.log(`📹 ${videos.length} vidéos trouvées dans la base de données`);
    
    let cleanedCount = 0;
    
    for (const video of videos) {
      console.log(`\n📹 Traitement de la vidéo: ${video.title}`);
      console.log('  - s3Url:', video.s3Url);
      console.log('  - Status:', video.status);
      
      // Vérifier si l'URL est cassée (locale mais pas Cloudinary)
      if (video.s3Url && video.s3Url.startsWith('/uploads/') && !video.s3Url.includes('cloudinary.com')) {
        console.log('❌ URL cassée détectée - Suppression de la vidéo');
        
        try {
          await Video.findByIdAndDelete(video._id);
          console.log('✅ Vidéo supprimée:', video.title);
          cleanedCount++;
        } catch (error) {
          console.error('❌ Erreur lors de la suppression:', error);
        }
      } else if (video.s3Url && video.s3Url.includes('cloudinary.com')) {
        console.log('✅ URL Cloudinary valide - Conservée');
      } else if (!video.s3Url) {
        console.log('⚠️ Pas d\'URL - Suppression de la vidéo');
        try {
          await Video.findByIdAndDelete(video._id);
          console.log('✅ Vidéo supprimée:', video.title);
          cleanedCount++;
        } catch (error) {
          console.error('❌ Erreur lors de la suppression:', error);
        }
      } else {
        console.log('✅ URL valide - Conservée');
      }
    }
    
    console.log(`\n🎉 Nettoyage terminé !`);
    console.log(`✅ ${cleanedCount} vidéos supprimées`);
    console.log(`✅ Base de données nettoyée`);
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

// Exécuter le nettoyage
cleanupBrokenVideos();
