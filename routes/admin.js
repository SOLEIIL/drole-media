const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Video = require('../models/Video');
const Admin = require('../models/Admin');

// Middleware d'auth admin (simplifié)
function authAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('🔍 Header Authorization:', authHeader);
  
  const token = authHeader?.split(' ')[1];
  console.log('🔑 Token extrait:', token ? `${token.substring(0, 20)}...` : 'Aucun');
  
  if (!token) {
    console.log('❌ Token manquant');
    return res.status(401).json({ error: 'Token manquant' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'drole_media_secret_key_2025');
    console.log('✅ Token décodé avec succès');
    
    if (decoded.isAdmin === true) {
      console.log('✅ Accès admin autorisé');
      req.admin = decoded;
      next();
    } else {
      console.log('❌ Accès refusé - pas admin');
      res.status(403).json({ error: 'Accès admin requis' });
    }
  } catch (err) {
    console.log('❌ Erreur de vérification token:', err.message);
    res.status(401).json({ error: 'Token invalide' });
  }
}

// POST /api/admin/login : connexion admin
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin) return res.status(401).json({ error: 'Identifiants invalides' });
  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });
  const token = jwt.sign({ id: admin._id, username: admin.username, isAdmin: true }, process.env.JWT_SECRET || 'drole_media_secret_key_2025', { expiresIn: '1d' });
  res.json({ token });
});

// GET /api/admin/videos : liste des vidéos à valider
router.get('/videos', authAdmin, async (req, res) => {
  try {
    const videos = await Video.find({ status: 'pending' })
      .populate('category')
      .populate('user', 'name email');
    
    // Ajouter des valeurs par défaut pour les vidéos existantes qui n'ont pas les nouveaux champs
    const videosWithDefaults = videos.map(video => {
      const videoObj = video.toObject();
      return {
        ...videoObj,
        recordedVideo: videoObj.recordedVideo || 'no',
        copyrightOwnership: videoObj.copyrightOwnership || 'no',
        termsAgreement: videoObj.termsAgreement !== undefined ? videoObj.termsAgreement : true,
        signature: videoObj.signature || 'Non spécifié'
      };
    });
    
    console.log('📹 Vidéos avec valeurs par défaut:', videosWithDefaults.map(v => ({
      title: v.title,
      recordedVideo: v.recordedVideo,
      copyrightOwnership: v.copyrightOwnership,
      signature: v.signature
    })));
    
    // Debug: Afficher les données brutes de la base de données
    console.log('🔍 Données brutes de la base de données:');
    videos.forEach((video, index) => {
      console.log(`📹 Vidéo ${index + 1} (brute):`, {
        title: video.title,
        recordedVideo: video.recordedVideo,
        copyrightOwnership: video.copyrightOwnership,
        termsAgreement: video.termsAgreement,
        signature: video.signature,
        user: video.user,
        userId: video.user?._id,
        userName: video.user?.name,
        userEmail: video.user?.email,
        hasRecordedVideo: video.hasOwnProperty('recordedVideo'),
        hasCopyrightOwnership: video.hasOwnProperty('copyrightOwnership'),
        // Debug complet de l'objet user
        userObject: JSON.stringify(video.user, null, 2)
      });
    });
    
    // Debug: Vérifier les utilisateurs dans la base de données
    const User = require('../models/User');
    const userIds = videos.map(v => v.user).filter(id => id);
    console.log('🔍 IDs utilisateurs trouvés:', userIds);
    
    if (userIds.length > 0) {
      const users = await User.find({ _id: { $in: userIds } });
      console.log('🔍 Utilisateurs trouvés dans la DB:', users.map(u => ({ id: u._id, name: u.name, email: u.email })));
      
      // Debug: Vérifier chaque utilisateur individuellement
      for (const userId of userIds) {
        const user = await User.findById(userId);
        console.log(`🔍 Utilisateur ${userId}:`, user ? { id: user._id, name: user.name, email: user.email } : 'Non trouvé');
      }
    }
    
    res.json(videosWithDefaults);
  } catch (err) {
    console.error('❌ Erreur récupération vidéos:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos.' });
  }
});

// GET /api/admin/videos/approved : liste des vidéos approuvées
router.get('/videos/approved', authAdmin, async (req, res) => {
  try {
    const videos = await Video.find({ status: 'validated' })
      .populate('category')
      .populate('user', 'name email')
      .sort({ validatedAt: -1, submittedAt: -1 });
    
    // Ajouter des valeurs par défaut pour les vidéos existantes qui n'ont pas les nouveaux champs
    const videosWithDefaults = videos.map(video => {
      const videoObj = video.toObject();
      return {
        ...videoObj,
        recordedVideo: videoObj.recordedVideo || 'no',
        copyrightOwnership: videoObj.copyrightOwnership || 'no',
        termsAgreement: videoObj.termsAgreement !== undefined ? videoObj.termsAgreement : true,
        signature: videoObj.signature || 'Non spécifié'
      };
    });
    
    res.json(videosWithDefaults);
  } catch (err) {
    console.error('Erreur lors de la récupération des vidéos approuvées:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos approuvées.' });
  }
});

// POST /api/admin/videos/:id/validate : valider une vidéo
router.post('/videos/:id/validate', authAdmin, async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id, 
      { 
        status: 'validated',
        validatedAt: new Date()
      }, 
      { new: true }
    );
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la validation.' });
  }
});

// POST /api/admin/videos/:id/reject : rejeter une vidéo
router.post('/videos/:id/reject', authAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const video = await Video.findByIdAndUpdate(
      req.params.id, 
      { 
        status: 'rejected',
        rejectionReason: rejectionReason || 'Vidéo rejetée par l\'administrateur',
        rejectedAt: new Date()
      }, 
      { new: true }
    );
    res.json(video);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors du rejet.' });
  }
});

// PUT /api/admin/videos/:id/category : modifier la catégorie d'une vidéo
router.put('/videos/:id/category', authAdmin, async (req, res) => {
  try {
    const { categoryId } = req.body;
    console.log('Mise à jour catégorie vidéo:', req.params.id, 'vers:', categoryId);
    
    const updateData = { category: categoryId };
    if (!categoryId) {
      updateData.category = null; // Enlever la catégorie si categoryId est vide
    }
    
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category').populate('user', 'name email');
    
    if (!video) {
      return res.status(404).json({ error: 'Vidéo non trouvée.' });
    }
    
    console.log('Vidéo mise à jour:', video);
    res.json(video);
  } catch (err) {
    console.error('Erreur mise à jour catégorie:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour de la catégorie.' });
  }
});

// DELETE /api/admin/videos/:id : supprimer une vidéo
router.delete('/videos/:id', authAdmin, async (req, res) => {
  try {
    await Video.findByIdAndDelete(req.params.id);
    res.json({ message: 'Vidéo supprimée.' });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

// GET /api/admin/videos/all : toutes les vidéos pour les statistiques
router.get('/videos/all', authAdmin, async (req, res) => {
  try {
    const videos = await Video.find({})
      .populate('category')
      .populate('user', 'name email')
      .sort({ submittedAt: -1 });
    res.json(videos);
  } catch (err) {
    console.error('Erreur lors de la récupération de toutes les vidéos:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos.' });
  }
});

// Récupérer tous les utilisateurs
router.get('/users', authAdmin, async (req, res) => {
  try {
    console.log('🔍 Récupération de tous les utilisateurs');
    
    const User = require('../models/User');
    const Video = require('../models/Video');
    
    // Récupérer tous les utilisateurs
    const users = await User.find({}, '-password');
    
    // Pour chaque utilisateur, récupérer ses vidéos séparément
    const usersWithVideos = await Promise.all(users.map(async (user) => {
      const videos = await Video.find({ user: user._id }, 'title status submittedAt');
      return {
        ...user.toObject(),
        videos: videos
      };
    }));
    
    console.log(`✅ ${usersWithVideos.length} utilisateurs récupérés`);
    console.log('👥 Détails des utilisateurs:');
    usersWithVideos.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.name} (${user.email}) - ${user.videos ? user.videos.length : 0} vidéos`);
    });
    
    res.json(usersWithVideos);
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Récupérer les détails d'un utilisateur
router.get('/users/:userId', authAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Récupération détails utilisateur:', userId);
    
    const User = require('../models/User');
    const Video = require('../models/Video');
    
    const user = await User.findById(userId, '-password');
    
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Récupérer les vidéos de l'utilisateur séparément
    const videos = await Video.find({ user: user._id }, 'title description status submittedAt category recordedVideo copyrightOwnership signature');
    
    const userWithVideos = {
      ...user.toObject(),
      videos: videos
    };
    
    console.log('✅ Détails utilisateur récupérés:', user.email);
    
    res.json(userWithVideos);
  } catch (error) {
    console.error('❌ Erreur récupération détails utilisateur:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// Bannir/Débannir un utilisateur
router.patch('/users/:userId/ban', authAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { isBanned } = req.body;
    
    console.log('🔍 Modification statut ban utilisateur:', userId, 'isBanned:', isBanned);
    
    const User = require('../models/User');
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Empêcher de bannir un admin
    if (user.isAdmin) {
      return res.status(403).json({ error: 'Impossible de bannir un administrateur' });
    }
    
    // Corriger le nom si undefined
    if (!user.name || user.name === 'undefined') {
      user.name = user.email || 'Utilisateur';
      console.log('🔧 Nom utilisateur corrigé:', user.name);
    }
    
    user.isBanned = isBanned;
    await user.save();
    
    console.log('✅ Statut ban utilisateur modifié:', user.email, 'isBanned:', user.isBanned);
    
    res.json({
      message: isBanned ? 'Utilisateur banni avec succès' : 'Utilisateur débanni avec succès',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        isBanned: user.isBanned
      }
    });
  } catch (error) {
    console.error('❌ Erreur modification statut ban:', error);
    res.status(500).json({ error: 'Erreur interne du serveur' });
  }
});

// POST /api/admin/contact : formulaire de contact (public)
router.post('/contact', async (req, res) => {
  try {
    console.log('📧 Formulaire de contact reçu:', req.body);
    
    const { name, email, subject, message } = req.body;
    
    // Validation des champs requis
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ 
        error: 'Tous les champs sont requis' 
      });
    }
    
    // Validation de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Adresse email invalide' 
      });
    }
    
    // Ici vous pourriez ajouter l'envoi d'email avec nodemailer
    // Pour l'instant, on simule juste la réception
    
    console.log('✅ Message de contact reçu:');
    console.log('  - Nom:', name);
    console.log('  - Email:', email);
    console.log('  - Sujet:', subject);
    console.log('  - Message:', message);
    
    // Réponse de succès
    res.status(200).json({ 
      message: 'Message envoyé avec succès ! Nous vous répondrons dans les plus brefs délais.',
      success: true
    });
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi du message de contact:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'envoi du message',
      details: error.message 
    });
  }
});

module.exports = router;