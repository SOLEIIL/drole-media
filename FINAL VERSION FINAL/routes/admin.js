const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Video = require('../models/Video');
const Admin = require('../models/Admin');
const Category = require('../models/Category');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
  const token = jwt.sign({ id: admin._id, username: admin.username, isAdmin: true }, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.json({ token });
});

// GET /api/admin/videos : liste des vidéos à valider
router.get('/videos', authAdmin, async (req, res) => {
  try {
    const videos = await Video.find({ status: 'pending' })
      .populate('category')
      .populate('user', 'name email isBanned');
    
    // Filtrer les vidéos des utilisateurs bannis
    const filteredVideos = videos.filter(video => {
      if (!video.user || video.user.isBanned) {
        return false;
      }
      return true;
    });
    
    // Ajouter des valeurs par défaut pour les vidéos existantes qui n'ont pas les nouveaux champs
    const videosWithDefaults = filteredVideos.map(video => {
      const videoObj = video.toObject();
      return {
        ...videoObj,
        recordedVideo: videoObj.recordedVideo || 'no',
        copyrightOwnership: videoObj.copyrightOwnership || 'no',
        termsAgreement: videoObj.termsAgreement !== undefined ? videoObj.termsAgreement : true,
        signature: videoObj.signature || 'Non spécifié'
      };
    });
    
    console.log(`📹 Vidéos en attente: ${videos.length} total, ${videosWithDefaults.length} visibles (utilisateurs non bannis)`);
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
      .populate('user', 'name email isBanned')
      .sort({ validatedAt: -1, submittedAt: -1 });
    
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
      console.log('🔍 URL vidéo dans /api/admin/videos/approved:', videoObj.s3Url);
      
      // Ajouter des valeurs par défaut pour les vidéos existantes qui n'ont pas les nouveaux champs
      return {
        ...videoObj,
        recordedVideo: videoObj.recordedVideo || 'no',
        copyrightOwnership: videoObj.copyrightOwnership || 'no',
        termsAgreement: videoObj.termsAgreement !== undefined ? videoObj.termsAgreement : true,
        signature: videoObj.signature || 'Non spécifié'
      };
    });
    
    console.log(`📹 Vidéos approuvées: ${videos.length} total, ${correctedVideos.length} visibles (utilisateurs non bannis)`);
    res.json(correctedVideos);
  } catch (err) {
    console.error('Erreur lors de la récupération des vidéos approuvées:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des vidéos approuvées.' });
  }
});

// POST /api/admin/videos/cleanup : nettoyer les anciennes vidéos
router.post('/videos/cleanup', authAdmin, async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Lire les fichiers réellement présents dans le dossier uploads
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    let existingFiles = [];
    
    try {
      existingFiles = fs.readdirSync(uploadsDir)
        .filter(file => file.endsWith('.mp4'))
        .map(file => `/uploads/${file}`);
    } catch (error) {
      console.log('Dossier uploads non trouvé ou vide');
    }
    
    console.log('📁 Fichiers présents dans uploads:', existingFiles);
    
    // Récupérer toutes les vidéos de la base de données
    const allVideos = await Video.find({});
    const videosToDelete = [];
    
    allVideos.forEach(video => {
      // Extraire le nom du fichier de s3Url
      const s3Url = video.s3Url || '';
      const filename = s3Url.replace('/uploads/', '');
      
      // Vérifier si le fichier existe réellement
      if (s3Url && s3Url.startsWith('/uploads/') && !existingFiles.includes(s3Url)) {
        videosToDelete.push(video._id);
        console.log(`❌ Vidéo à supprimer: ${video.title} (${s3Url}) - fichier manquant`);
      }
    });
    
    if (videosToDelete.length > 0) {
      await Video.deleteMany({ _id: { $in: videosToDelete } });
      console.log(`🗑️ ${videosToDelete.length} vidéos supprimées (fichiers manquants)`);
      res.json({ 
        message: `${videosToDelete.length} vidéos supprimées (fichiers manquants)`,
        deletedCount: videosToDelete.length,
        existingFiles: existingFiles
      });
    } else {
      res.json({ 
        message: 'Toutes les vidéos ont leurs fichiers correspondants',
        deletedCount: 0,
        existingFiles: existingFiles
      });
    }
  } catch (error) {
    console.error('Erreur lors du nettoyage des vidéos:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/videos/cleanup-all : nettoyer toutes les vidéos (nettoyage complet)
router.post('/videos/cleanup-all', authAdmin, async (req, res) => {
  try {
    console.log('🧹 Début du nettoyage complet de la base de données...');
    
    // Supprimer toutes les vidéos de la base de données
    const result = await Video.deleteMany({});
    
    console.log(`🗑️ ${result.deletedCount} vidéos supprimées de la base de données`);
    
    res.json({ 
      message: `Nettoyage complet terminé. ${result.deletedCount} vidéos supprimées de la base de données.`,
      deletedCount: result.deletedCount,
      status: 'success'
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage complet:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/admin/videos/keep-only-test1 : garder seulement "test1"
router.post('/videos/keep-only-test1', authAdmin, async (req, res) => {
  try {
    console.log('🧹 Début du nettoyage - garder seulement "test1"...');
    
    // Supprimer toutes les vidéos sauf celles avec le titre "test1"
    const result = await Video.deleteMany({ 
      title: { $ne: 'test1' } 
    });
    
    console.log(`🗑️ ${result.deletedCount} vidéos supprimées (gardé seulement "test1")`);
    
    res.json({ 
      message: `Nettoyage terminé. ${result.deletedCount} vidéos supprimées. Seule "test1" reste.`,
      deletedCount: result.deletedCount,
      status: 'success'
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    res.status(500).json({ error: 'Erreur serveur' });
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

// Supprimer un utilisateur (admin seulement)
router.delete('/users/:userId', authAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    
    console.log('🗑️ Tentative de suppression utilisateur:', userId);
    
    const User = require('../models/User');
    const Video = require('../models/Video');
    
    // Trouver l'utilisateur à supprimer
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    // Empêcher l'admin de se supprimer lui-même
    if (userToDelete.isAdmin) {
      return res.status(400).json({ error: 'Vous ne pouvez pas supprimer un compte administrateur.' });
    }
    
    console.log(`🗑️ Suppression de l'utilisateur: ${userToDelete.name} (${userToDelete.email})`);
    
    // Supprimer toutes les vidéos de l'utilisateur
    const deletedVideos = await Video.deleteMany({ user: userId });
    console.log(`📹 ${deletedVideos.deletedCount} vidéos supprimées pour l'utilisateur ${userToDelete.email}`);
    
    // Supprimer l'utilisateur
    await User.findByIdAndDelete(userId);
    console.log(`✅ Utilisateur ${userToDelete.email} supprimé avec succès`);
    
    res.json({
      message: `Utilisateur "${userToDelete.name}" supprimé avec succès. ${deletedVideos.deletedCount} vidéo(s) supprimée(s).`,
      deletedVideosCount: deletedVideos.deletedCount
    });
  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
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
    
    // Envoi d'email avec nodemailer
    const nodemailer = require('nodemailer');
    
    console.log('📧 Configuration de Nodemailer...');
    console.log('  - EMAIL_USER:', process.env.EMAIL_USER ? 'Configuré' : 'Non configuré');
    console.log('  - EMAIL_PASS:', process.env.EMAIL_PASS ? 'Configuré' : 'Non configuré');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      tls: {
        rejectUnauthorized: false
      },
      debug: true,
      logger: true
    });
    
    // Vérifier la connexion
    console.log('🔍 Vérification de la connexion SMTP...');
    try {
      await transporter.verify();
      console.log('✅ Connexion SMTP vérifiée avec succès');
    } catch (verifyError) {
      console.error('❌ Erreur de vérification SMTP:', verifyError);
      throw new Error(`Erreur de vérification SMTP: ${verifyError.message}`);
    }
    
    // Préparer l'email
    const mailOptions = {
      from: `"DROLE MEDIA" <${process.env.EMAIL_USER}>`,
      to: 'u0072585458@gmail.com', // Email de destination
      subject: `[DROLE MEDIA] Contact - ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">DROLE MEDIA</h1>
            <p style="color: white; margin: 10px 0 0 0;">Nouveau message de contact</p>
          </div>
          <div style="padding: 30px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Message de contact reçu</h2>
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="color: #667eea; margin-bottom: 15px;">Informations de l'expéditeur</h3>
              <p><strong>Nom :</strong> ${name}</p>
              <p><strong>Email :</strong> ${email}</p>
              <p><strong>Sujet :</strong> ${subject}</p>
            </div>
            
            <div style="background: white; padding: 20px; border-radius: 8px;">
              <h3 style="color: #667eea; margin-bottom: 15px;">Message</h3>
              <p style="line-height: 1.6; color: #333;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Ce message a été envoyé depuis le formulaire de contact de DROLE MEDIA
            </p>
          </div>
        </div>
      `,
      text: `
        DROLE MEDIA - Nouveau message de contact
        
        Informations de l'expéditeur:
        - Nom: ${name}
        - Email: ${email}
        - Sujet: ${subject}
        
        Message:
        ${message}
        
        ---
        Ce message a été envoyé depuis le formulaire de contact de DROLE MEDIA
      `
    };
    
    console.log('📤 Envoi de l\'email...');
    console.log('  - De:', mailOptions.from);
    console.log('  - À:', mailOptions.to);
    console.log('  - Sujet:', mailOptions.subject);
    
    // Envoyer l'email
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email de contact envoyé avec succès!');
    console.log('  - Message ID:', info.messageId);
    console.log('  - Réponse:', info.response);
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

// GET /api/admin/categories : liste des catégories avec statistiques
router.get('/categories', authAdmin, async (req, res) => {
  try {
    const categories = await Category.find({});
    const categoriesWithStats = [];
    
    for (const category of categories) {
      const videoCount = await Video.countDocuments({ category: category._id });
      categoriesWithStats.push({
        ...category.toObject(),
        videoCount: videoCount
      });
    }
    
    res.json(categoriesWithStats);
  } catch (err) {
    console.error('❌ Erreur lors de la récupération des catégories:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des catégories.' });
  }
});

// POST /api/admin/categories : ajout catégorie
router.post('/categories', authAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    const category = new Category({ name });
    await category.save();
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la création de la catégorie.' });
  }
});

// PUT /api/admin/categories/:id : modification catégorie
router.put('/categories/:id', authAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom de la catégorie est requis.' });
    }
    
    // Vérifier si des vidéos utilisent cette catégorie
    const videosUsingCategory = await Video.find({ category: req.params.id });
    console.log(`📹 ${videosUsingCategory.length} vidéo(s) utilisent cette catégorie`);
    
    // Mettre à jour la catégorie
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name: name.trim() },
      { new: true }
    );
    
    if (!updatedCategory) {
      return res.status(404).json({ error: 'Catégorie non trouvée.' });
    }
    
    // Les vidéos qui utilisent cette catégorie seront automatiquement mises à jour
    // car elles référencent l'ID de la catégorie, pas le nom
    // Le nom sera mis à jour lors du populate dans les requêtes
    
    const message = videosUsingCategory.length > 0 
      ? `Catégorie modifiée avec succès. ${videosUsingCategory.length} vidéo(s) utilisent cette catégorie et seront mises à jour automatiquement.`
      : 'Catégorie modifiée avec succès.';
    
    res.json({ 
      message: message,
      category: updatedCategory,
      updatedVideosCount: videosUsingCategory.length
    });
  } catch (err) {
    console.error('❌ Erreur lors de la modification de la catégorie:', err);
    res.status(500).json({ error: 'Erreur lors de la modification de la catégorie.' });
  }
});

// DELETE /api/admin/categories/:id : suppression catégorie
router.delete('/categories/:id', authAdmin, async (req, res) => {
  try {
    // Vérifier si des vidéos utilisent cette catégorie
    const videosUsingCategory = await Video.find({ category: req.params.id });
    
    if (videosUsingCategory.length > 0) {
      console.log(`⚠️ ${videosUsingCategory.length} vidéo(s) utilisent cette catégorie. Suppression de la catégorie et mise à jour des vidéos...`);
      
      // Mettre à jour toutes les vidéos qui utilisent cette catégorie (retirer la catégorie)
      await Video.updateMany(
        { category: req.params.id },
        { $unset: { category: "" } }
      );
      
      console.log(`✅ ${videosUsingCategory.length} vidéo(s) mises à jour (catégorie retirée)`);
    }
    
    // Supprimer la catégorie
    await Category.findByIdAndDelete(req.params.id);
    
    const message = videosUsingCategory.length > 0 
      ? `Catégorie supprimée avec succès. ${videosUsingCategory.length} vidéo(s) ont été mises à jour (catégorie retirée).`
      : 'Catégorie supprimée avec succès.';
    
    res.json({ 
      message: message,
      updatedVideosCount: videosUsingCategory.length
    });
  } catch (err) {
    console.error('❌ Erreur lors de la suppression de la catégorie:', err);
    res.status(500).json({ error: 'Erreur lors de la suppression.' });
  }
});

module.exports = router;