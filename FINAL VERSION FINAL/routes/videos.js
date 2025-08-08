const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
const Video = require('../models/Video');
const Category = require('../models/Category');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

// Configuration stockage temporaire pour Cloudinary
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accepter les vidéos et images
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      console.log('Fichier accepté:', file.originalname, 'Type:', file.mimetype);
      cb(null, true);
    } else {
      console.log('Fichier rejeté:', file.originalname, 'Type:', file.mimetype);
      cb(new Error('Type de fichier non supporté'), false);
    }
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Middleware d'authentification obligatoire pour les vidéos
const requireAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Token d\'authentification requis' });
  }
  
      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

// POST /api/videos/submit : soumission (authentification obligatoire)
router.post('/submit', requireAuth, upload.single('video'), async (req, res) => {
  try {
    console.log('Données reçues:', req.body);
    console.log('Fichier reçu:', req.file);
    console.log('Utilisateur:', req.user);
    
    // Debug: Afficher les champs de copyright spécifiquement
    console.log('🔍 Champs copyright reçus:');
    console.log('  - recordedVideo:', req.body.recordedVideo);
    console.log('  - copyrightOwnership:', req.body.copyrightOwnership);
    console.log('  - termsAgreement:', req.body.termsAgreement);
    console.log('  - signature:', req.body.signature);
    console.log('  - recorderEmail:', req.body.recorderEmail);
    console.log('  - ownerEmail:', req.body.ownerEmail);
    console.log('  - userEmail:', req.user?.email);
    
    const { title, description, category, recordedVideo, copyrightOwnership, termsAgreement, signature, recorderEmail, ownerEmail } = req.body;
    
    console.log('🔍 Emails extraits:');
    console.log('  - recorderEmail extrait:', recorderEmail);
    console.log('  - ownerEmail extrait:', ownerEmail);
    
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier vidéo envoyé.' });
    
    // Validation des nouveaux champs (optionnels pour compatibilité)
    if (!recordedVideo || !copyrightOwnership) {
      console.log('⚠️ Champs copyright manquants, utilisation des valeurs par défaut');
    }
    
    let videoUrl;
    let cloudinaryId = null;
    
    // Vérifier si Cloudinary est configuré correctement
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudName || cloudName === 'demo' || !apiKey || apiKey === 'demo' || !apiSecret || apiSecret === 'demo') {
      console.log('⚠️ Cloudinary non configuré, utilisation du stockage local temporaire');
      
      // Stockage local temporaire
      const fs = require('fs');
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      
      // Créer le dossier s'il n'existe pas
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
      const filePath = path.join(uploadsDir, filename);
      
      fs.writeFileSync(filePath, req.file.buffer);
      
      videoUrl = `/uploads/${filename}`;
      console.log('✅ Vidéo uploadée localement:', videoUrl);
    } else {
      // Upload vers Cloudinary
      console.log('☁️ Upload vers Cloudinary...');
      
      try {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: 'video',
              folder: 'drole-media/videos',
              public_id: `video_${Date.now()}`,
              overwrite: true
            },
            (error, result) => {
              if (error) {
                console.error('❌ Erreur upload Cloudinary:', error);
                reject(error);
              } else {
                console.log('✅ Upload Cloudinary réussi:', result.secure_url);
                resolve(result);
              }
            }
          );
          
          // Stream le fichier vers Cloudinary
          uploadStream.end(req.file.buffer);
        });
        
        videoUrl = uploadResult.secure_url;
        cloudinaryId = uploadResult.public_id;
        console.log('✅ Vidéo uploadée vers Cloudinary:', videoUrl);
      } catch (error) {
        console.error('❌ Erreur lors de l\'upload Cloudinary:', error);
        return res.status(500).json({ error: 'Erreur lors de l\'upload vers Cloudinary' });
      }
    }
    
    // Créer l'objet vidéo
    const videoData = {
      title,
      description,
      s3Url: videoUrl,
      cloudinaryId: cloudinaryId,
      status: 'pending'
    };
    
    // Ajouter les champs de copyright et propriété explicitement
    videoData.recordedVideo = recordedVideo || 'no';
    videoData.copyrightOwnership = copyrightOwnership || 'no';
    videoData.termsAgreement = termsAgreement === 'true' || termsAgreement === true;
    videoData.signature = signature || 'Non spécifié';
    videoData.recorderEmail = recorderEmail || '';
    videoData.ownerEmail = ownerEmail || '';
    videoData.userEmail = req.user?.email || '';
    
    console.log('📹 Données vidéo:', videoData);
    
    // Ajouter l'utilisateur s'il est connecté
    if (req.user && req.user.userId) {
      videoData.user = req.user.userId;
    }
    
    // Ajouter la catégorie si spécifiée
    if (category && category.trim() !== '') {
      videoData.category = category;
    }
    
    // Créer et sauvegarder la vidéo
    const video = new Video(videoData);
    await video.save();
    
    console.log('✅ Vidéo sauvegardée avec succès');
    res.status(201).json({ 
      message: 'Vidéo soumise avec succès !', 
      video: video,
      videoUrl: videoUrl
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de la soumission:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la soumission' });
  }
});

// GET /api/videos : liste publique des vidéos validées
router.get('/', async (req, res) => {
  try {
    const User = require('../models/User');
    const videos = await Video.find({ status: 'validated' })
      .populate('category')
      .populate('user', 'name email isBanned');
    
    // Filtrer les vidéos des utilisateurs bannis
    const filteredVideos = videos.filter(video => {
      if (!video.user || video.user.isBanned) {
        return false;
      }
      return true;
    });
    
    // Conserver les URLs Cloudinary et locales telles quelles
    const correctedVideos = filteredVideos.map(video => {
      const videoObj = video.toObject();
      console.log('🔍 URL vidéo dans /api/videos:', videoObj.s3Url);
      return videoObj;
    });
    
    console.log(`📹 Vidéos validées: ${videos.length} total, ${correctedVideos.length} visibles (utilisateurs non bannis)`);
    res.json(correctedVideos);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos.' });
  }
});

// GET /api/videos/approved : liste publique des vidéos approuvées
router.get('/approved', async (req, res) => {
  try {
    const User = require('../models/User');
    const videos = await Video.find({ status: 'validated' })
      .populate('user', 'name email isBanned')
      .populate('category', 'name')
      .sort({ submittedAt: -1 });
    
    // Filtrer les vidéos des utilisateurs bannis
    const filteredVideos = videos.filter(video => {
      if (!video.user || video.user.isBanned) {
        return false;
      }
      return true;
    });
    
    // Conserver les URLs Cloudinary et locales telles quelles
    const correctedVideos = filteredVideos.map(video => {
      const videoObj = video.toObject();
      console.log('🔍 URL vidéo dans /api/videos/approved:', videoObj.s3Url);
      return videoObj;
    });
    
    console.log(`📹 Vidéos approuvées: ${videos.length} total, ${correctedVideos.length} visibles (utilisateurs non bannis)`);
    res.json(correctedVideos);
  } catch (error) {
    console.error('Erreur lors de la récupération des vidéos approuvées:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/videos/pending : liste publique des vidéos en attente
router.get('/pending', async (req, res) => {
  try {
    const User = require('../models/User');
    const videos = await Video.find({ status: 'pending' })
      .populate('category')
      .populate('user', 'name email isBanned')
      .sort({ submittedAt: -1 });
    
    // Filtrer les vidéos des utilisateurs bannis
    const filteredVideos = videos.filter(video => {
      if (!video.user || video.user.isBanned) {
        return false;
      }
      return true;
    });
    
    console.log(`📹 Vidéos en attente: ${videos.length} total, ${filteredVideos.length} visibles (utilisateurs non bannis)`);
    res.json(filteredVideos);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos en attente.' });
  }
});

// DELETE /api/videos/:id/cancel : annuler une vidéo (utilisateur seulement)
router.delete('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const videoId = req.params.id;
    const video = await Video.findById(videoId);
    
    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée.' });
    }
    
    // Vérifier que l'utilisateur est connecté
    if (!req.user) {
      return res.status(401).json({ error: 'Vous devez être connecté pour annuler une vidéo.' });
    }
    
    // Vérifier que la vidéo appartient à l'utilisateur connecté
    if (video.user.toString() !== req.user.userId) {
      return res.status(403).json({ error: 'Vous ne pouvez annuler que vos propres vidéos.' });
    }
    
    // Vérifier que la vidéo est en attente
    if (video.status !== 'pending') {
      return res.status(400).json({ error: 'Vous ne pouvez annuler que les vidéos en attente.' });
    }
    
    // Supprimer la vidéo
    await Video.findByIdAndDelete(videoId);
    
    console.log(`✅ Vidéo ${videoId} annulée par l'utilisateur ${req.user.email}`);
    res.json({ message: 'Vidéo annulée avec succès.' });
  } catch (err) {
    console.error('❌ Erreur annulation vidéo:', err);
    res.status(500).json({ error: 'Erreur lors de l\'annulation de la vidéo.' });
  }
});

// GET /api/videos/stats : statistiques des vidéos (avec filtrage des utilisateurs bannis)
router.get('/stats', async (req, res) => {
  try {
    const User = require('../models/User');
    
    // Récupérer toutes les vidéos avec les utilisateurs
    const allVideos = await Video.find({})
      .populate('user', 'name email isBanned')
      .populate('category', 'name');
    
    // Filtrer les vidéos des utilisateurs bannis
    const filteredVideos = allVideos.filter(video => {
      if (!video.user || video.user.isBanned) {
        return false;
      }
      return true;
    });
    
    // Compter les utilisateurs non bannis
    const totalUsers = await User.countDocuments({ 
      $or: [
        { isBanned: false },
        { isBanned: { $exists: false } },
        { isBanned: null }
      ]
    });
    
    console.log(`👥 Comptage utilisateurs: ${totalUsers} membres actifs`);
    
    // Calculer les statistiques
    const stats = {
      total: filteredVideos.length,
      validated: filteredVideos.filter(v => v.status === 'validated').length,
      pending: filteredVideos.filter(v => v.status === 'pending').length,
      rejected: filteredVideos.filter(v => v.status === 'rejected').length,
      members: totalUsers
    };
    
    console.log(`📊 Statistiques calculées: ${filteredVideos.length} vidéos visibles sur ${allVideos.length} total - ${totalUsers} membres`);
    res.json(stats);
  } catch (error) {
    console.error('Erreur lors du calcul des statistiques:', error);
    res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
  }
});

module.exports = router;