const cloudinary = require('cloudinary').v2;

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

async function cleanupCloudinary() {
  try {
    console.log('☁️ Début du nettoyage Cloudinary...');
    
    // Vérifier si Cloudinary est configuré
    if (process.env.CLOUDINARY_CLOUD_NAME === 'demo' || !process.env.CLOUDINARY_CLOUD_NAME) {
      console.log('⚠️ Cloudinary non configuré ou en mode demo');
      return;
    }
    
    // Lister toutes les ressources vidéo
    console.log('📹 Recherche des ressources vidéo sur Cloudinary...');
    const result = await cloudinary.api.resources({
      type: 'video',
      max_results: 1000
    });
    
    console.log(`📊 ${result.resources.length} ressources vidéo trouvées sur Cloudinary`);
    
    if (result.resources.length === 0) {
      console.log('✅ Aucune vidéo à supprimer sur Cloudinary');
      return;
    }
    
    // Supprimer chaque ressource
    let deletedCount = 0;
    for (const resource of result.resources) {
      try {
        await cloudinary.uploader.destroy(resource.public_id, { resource_type: 'video' });
        console.log(`🗑️ Vidéo supprimée: ${resource.public_id}`);
        deletedCount++;
      } catch (error) {
        console.log(`❌ Erreur suppression ${resource.public_id}:`, error.message);
      }
    }
    
    console.log(`✅ ${deletedCount} vidéos supprimées de Cloudinary`);
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage Cloudinary:', error);
  }
}

cleanupCloudinary();
