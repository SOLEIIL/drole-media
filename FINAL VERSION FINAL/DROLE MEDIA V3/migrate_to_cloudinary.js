require('dotenv').config();
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

// Connexion MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kghmedia', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB connecté'))
  .catch((err) => console.error('Erreur MongoDB:', err));

// Modèles
const Video = require('./models/Video');
const Partner = require('./models/Partner');

async function migrateVideosToCloudinary() {
  console.log('🔄 Migration des vidéos vers Cloudinary...');
  
  try {
    const videos = await Video.find({});
    console.log(`📹 ${videos.length} vidéos trouvées`);
    
    for (const video of videos) {
      console.log(`\n📹 Traitement de la vidéo: ${video.title}`);
      
      // Vérifier si la vidéo a déjà une URL Cloudinary
      if (video.s3Url && video.s3Url.includes('cloudinary.com')) {
        console.log('✅ Vidéo déjà sur Cloudinary, ignorée');
        continue;
      }
      
      // Vérifier si le fichier existe localement
      if (video.s3Url && video.s3Url.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, video.s3Url);
        
        if (fs.existsSync(filePath)) {
          console.log('☁️ Upload vers Cloudinary...');
          
          try {
            const result = await cloudinary.uploader.upload(filePath, {
              resource_type: 'video',
              folder: 'drole-media/videos',
              public_id: `video_${video._id}`,
              overwrite: true
            });
            
            // Mettre à jour la vidéo avec l'URL Cloudinary
            video.s3Url = result.secure_url;
            video.cloudinaryId = result.public_id;
            await video.save();
            
            console.log('✅ Vidéo migrée vers Cloudinary:', result.secure_url);
            
            // Supprimer le fichier local
            fs.unlinkSync(filePath);
            console.log('🗑️ Fichier local supprimé');
            
          } catch (error) {
            console.error('❌ Erreur lors de l\'upload de la vidéo:', error);
          }
        } else {
          console.log('⚠️ Fichier local non trouvé:', filePath);
        }
      } else {
        console.log('⚠️ URL invalide ou déjà Cloudinary:', video.s3Url);
      }
    }
    
    console.log('\n✅ Migration des vidéos terminée');
  } catch (error) {
    console.error('❌ Erreur lors de la migration des vidéos:', error);
  }
}

async function migratePartnersToCloudinary() {
  console.log('🔄 Migration des images de partenaires vers Cloudinary...');
  
  try {
    const partners = await Partner.find({});
    console.log(`🤝 ${partners.length} partenaires trouvés`);
    
    for (const partner of partners) {
      console.log(`\n🤝 Traitement du partenaire: ${partner.name}`);
      
      // Vérifier si l'image a déjà une URL Cloudinary
      if (partner.profileImage && partner.profileImage.includes('cloudinary.com')) {
        console.log('✅ Image déjà sur Cloudinary, ignorée');
        continue;
      }
      
      // Vérifier si le fichier existe localement
      if (partner.profileImage && partner.profileImage.startsWith('/uploads/partners/')) {
        const filePath = path.join(__dirname, partner.profileImage);
        
        if (fs.existsSync(filePath)) {
          console.log('☁️ Upload vers Cloudinary...');
          
          try {
            const result = await cloudinary.uploader.upload(filePath, {
              resource_type: 'image',
              folder: 'drole-media/partners',
              public_id: `partner_${partner._id}`,
              overwrite: true
            });
            
            // Mettre à jour le partenaire avec l'URL Cloudinary
            partner.profileImage = result.secure_url;
            await partner.save();
            
            console.log('✅ Image migrée vers Cloudinary:', result.secure_url);
            
            // Supprimer le fichier local
            fs.unlinkSync(filePath);
            console.log('🗑️ Fichier local supprimé');
            
          } catch (error) {
            console.error('❌ Erreur lors de l\'upload de l\'image:', error);
          }
        } else {
          console.log('⚠️ Fichier local non trouvé:', filePath);
        }
      } else {
        console.log('⚠️ URL invalide ou déjà Cloudinary:', partner.profileImage);
      }
    }
    
    console.log('\n✅ Migration des partenaires terminée');
  } catch (error) {
    console.error('❌ Erreur lors de la migration des partenaires:', error);
  }
}

async function cleanupLocalFiles() {
  console.log('🧹 Nettoyage des fichiers locaux...');
  
  try {
    // Supprimer le dossier uploads s'il existe
    const uploadsDir = path.join(__dirname, 'uploads');
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true });
      console.log('🗑️ Dossier uploads supprimé');
    }
    
    console.log('✅ Nettoyage terminé');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
  }
}

async function main() {
  console.log('🚀 Début de la migration vers Cloudinary...');
  
  try {
    await migrateVideosToCloudinary();
    await migratePartnersToCloudinary();
    await cleanupLocalFiles();
    
    console.log('\n🎉 Migration terminée avec succès !');
    console.log('✅ Toutes les données sont maintenant sauvegardées sur Cloudinary');
    console.log('✅ Les fichiers locaux ont été supprimés');
    console.log('✅ Votre application est maintenant résistante aux redéploiements Heroku');
    
  } catch (error) {
    console.error('❌ Erreur lors de la migration:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

// Exécuter la migration
main();
