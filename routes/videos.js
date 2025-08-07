const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const Video = require('../models/Video');
const Category = require('../models/Category');

// Configuration stockage local (temporaire)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Temporairement accepter tous les fichiers pour les tests
    console.log('Fichier reçu:', file.originalname, 'Type:', file.mimetype);
    cb(null, true);
  },
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max
  }
});

// Middleware optionnel pour extraire l'utilisateur du token (sans forcer l'authentification)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET || 'drole_media_secret_key_2025', (err, user) => {
      if (!err) {
        req.user = user;
      }
    });
  }
  next();
};

// POST /api/videos/submit : soumission (anonyme ou connecté)
router.post('/submit', optionalAuth, upload.single('video'), async (req, res) => {
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
    
    // Créer l'objet vidéo en gérant le cas où category est vide
    const videoData = {
      title,
      description,
      s3Url: `/uploads/${req.file.filename}`, // URL locale temporaire
      status: 'pending'
    };
    
    // Ajouter les champs de copyright et propriété explicitement
    videoData.recordedVideo = recordedVideo || 'no';
    videoData.copyrightOwnership = copyrightOwnership || 'no';
    videoData.termsAgreement = termsAgreement === 'true' || termsAgreement === true;
    videoData.signature = signature || 'Non spécifié';
    videoData.recorderEmail = recorderEmail || '';
    videoData.ownerEmail = ownerEmail || '';
    // Ajouter l'email de l'utilisateur qui soumet la vidéo
    videoData.userEmail = req.user?.email || '';
    
    console.log('🔍 Emails ajoutés à videoData:');
    console.log('  - videoData.recorderEmail:', videoData.recorderEmail);
    console.log('  - videoData.ownerEmail:', videoData.ownerEmail);
    console.log('  - videoData.userEmail:', videoData.userEmail);
    
    console.log('🔍 Emails reçus:');
    console.log('  - recorderEmail:', recorderEmail);
    console.log('  - ownerEmail:', ownerEmail);
    console.log('  - userEmail:', req.user?.email);
    
    console.log('📹 Données avant sauvegarde:', videoData);
    console.log('📹 Vérification des champs individuels:');
    console.log('  - recordedVideo:', recordedVideo);
    console.log('  - copyrightOwnership:', copyrightOwnership);
    console.log('  - termsAgreement:', termsAgreement);
    console.log('  - signature:', signature);
    console.log('  - recorderEmail:', recorderEmail);
    console.log('  - ownerEmail:', ownerEmail);
    console.log('  - userEmail:', req.user?.email);
    
    // Debug: Vérifier si les champs sont bien dans videoData
    console.log('🔍 Vérification des champs dans videoData:');
    console.log('  - videoData.recordedVideo:', videoData.recordedVideo);
    console.log('  - videoData.copyrightOwnership:', videoData.copyrightOwnership);
    console.log('  - videoData.termsAgreement:', videoData.termsAgreement);
    console.log('  - videoData.signature:', videoData.signature);
    console.log('  - videoData.recorderEmail:', videoData.recorderEmail);
    console.log('  - videoData.ownerEmail:', videoData.ownerEmail);
    console.log('  - videoData.userEmail:', videoData.userEmail);
    
    // Vérifier que tous les champs sont présents
    console.log('🔍 Vérification finale videoData:');
    console.log('  - Tous les champs présents:', {
        title: videoData.title,
        description: videoData.description,
        recordedVideo: videoData.recordedVideo,
        copyrightOwnership: videoData.copyrightOwnership,
        termsAgreement: videoData.termsAgreement,
        signature: videoData.signature,
        recorderEmail: videoData.recorderEmail,
        ownerEmail: videoData.ownerEmail,
        userEmail: videoData.userEmail
    });
    
    // Debug: Vérifier les valeurs originales
    console.log('🔍 Valeurs originales reçues:');
    console.log('  - recordedVideo (original):', recordedVideo);
    console.log('  - copyrightOwnership (original):', copyrightOwnership);
    console.log('  - termsAgreement (original):', termsAgreement);
    console.log('  - signature (original):', signature);
    
    // Debug: Vérifier les valeurs originales
    console.log('🔍 Valeurs originales reçues:');
    console.log('  - recordedVideo (original):', recordedVideo);
    console.log('  - copyrightOwnership (original):', copyrightOwnership);
    console.log('  - termsAgreement (original):', termsAgreement);
    console.log('  - signature (original):', signature);
    
    // Ajouter l'utilisateur s'il est connecté
    if (req.user && req.user.userId) {
      videoData.user = req.user.userId;
    }
    
    // Ajouter category seulement si elle n'est pas vide
    if (category && category.trim() !== '') {
      videoData.category = category;
    }
    
    const video = new Video(videoData);
    await video.save();
    console.log('Vidéo sauvegardée:', video);
    console.log('📹 Vérification des champs copyright:', {
      recordedVideo: video.recordedVideo,
      copyrightOwnership: video.copyrightOwnership,
      termsAgreement: video.termsAgreement,
      signature: video.signature,
      recorderEmail: video.recorderEmail,
      ownerEmail: video.ownerEmail,
      userEmail: video.userEmail
    });
    
    console.log('📹 Vérification des emails sauvegardés:');
    console.log('  - recorderEmail sauvegardé:', video.recorderEmail);
    console.log('  - ownerEmail sauvegardé:', video.ownerEmail);
    console.log('  - userEmail sauvegardé:', video.userEmail);
    res.status(201).json({ 
      message: 'Vidéo soumise avec succès, en attente de validation.',
      isAuthenticated: !!req.user
    });
  } catch (err) {
    console.error('Erreur lors de la soumission:', err);
    res.status(500).json({ 
      error: 'Erreur lors de la soumission.',
      details: err.message 
    });
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
    
    console.log(`📹 Vidéos validées: ${videos.length} total, ${filteredVideos.length} visibles (utilisateurs non bannis)`);
    res.json(filteredVideos);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos.' });
  }
});

// GET /api/videos/approved : liste publique des vidéos approuvées
router.get('/approved', async (req, res) => {
  try {
    const User = require('../models/User');
    const videos = await Video.find({ status: 'approved' })
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
    
    console.log(`📹 Vidéos approuvées: ${videos.length} total, ${filteredVideos.length} visibles (utilisateurs non bannis)`);
    res.json(filteredVideos);
  } catch (error) {
    console.error('Erreur lors de la récupération des vidéos approuvées:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// GET /api/videos/pending : liste publique des vidéos en attente
router.get('/pending', async (req, res) => {
  try {
    const videos = await Video.find({ status: 'pending' })
      .populate('category')
      .populate('user', 'name')
      .sort({ submittedAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos en attente.' });
  }
});

// DELETE /api/videos/:id/cancel : annuler une vidéo (utilisateur seulement)
router.delete('/:id/cancel', optionalAuth, async (req, res) => {
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

module.exports = router;