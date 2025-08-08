const express = require('express');
const router = express.Router();
const Partner = require('../models/Partner');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
  api_key: process.env.CLOUDINARY_API_KEY || 'demo',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'demo'
});

// Configuration Multer pour l'upload temporaire vers Cloudinary
const storage = multer.memoryStorage();

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = file.mimetype.startsWith('image/');
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Seuls les fichiers image sont autorisés (JPG, PNG, GIF)'));
        }
    }
});

// Middleware optionnel pour extraire l'utilisateur du token (sans forcer l'authentification)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.isAdmin === true) {
                req.user = decoded;
                console.log('✅ Utilisateur admin détecté');
            }
        } catch (error) {
            console.log('⚠️ Token invalide, mais on continue');
        }
    }
    next();
};

// Middleware pour vérifier l'authentification admin (optionnel)
const authenticateAdmin = (req, res, next) => {
    console.log('🔍 === VÉRIFICATION ADMIN PARTNERS ===');
    
    if (!req.user || !req.user.isAdmin) {
        console.log('❌ Accès refusé - pas admin');
        return res.status(403).json({ message: 'Accès refusé - Admin requis' });
    }
    
    console.log('✅ Accès admin autorisé');
    next();
};

// GET /api/partners - Récupérer tous les partenaires actifs (public)
router.get('/', async (req, res) => {
    try {
        const partners = await Partner.find({ status: 'active' }).sort({ createdAt: -1 });
        res.json(partners);
    } catch (error) {
        console.error('Erreur lors de la récupération des partenaires:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/partners/admin - Récupérer tous les partenaires (admin)
router.get('/admin', optionalAuth, authenticateAdmin, async (req, res) => {
    try {
        const partners = await Partner.find().sort({ createdAt: -1 });
        res.json(partners);
    } catch (error) {
        console.error('Erreur lors de la récupération des partenaires admin:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/partners/upload-image - Upload d'image de partenaire (admin)
router.post('/upload-image', optionalAuth, authenticateAdmin, upload.single('profileImage'), async (req, res) => {
    try {
        console.log('📸 Upload d\'image partenaire - Fichier reçu:', req.file);
        
        if (!req.file) {
            console.log('❌ Aucun fichier uploadé');
            return res.status(400).json({ message: 'Aucun fichier uploadé' });
        }
        
        // Vérifier si Cloudinary est configuré correctement
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;
        
        if (!cloudName || cloudName === 'demo' || !apiKey || apiKey === 'demo' || !apiSecret || apiSecret === 'demo') {
            console.log('⚠️ Cloudinary non configuré, utilisation du stockage local temporaire');
            
            // Stockage local temporaire
            const fs = require('fs');
            const uploadsDir = path.join(__dirname, '..', 'uploads', 'partners');
            
            // Créer le dossier s'il n'existe pas
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            
            const filename = `partner-${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(req.file.originalname)}`;
            const filePath = path.join(uploadsDir, filename);
            
            fs.writeFileSync(filePath, req.file.buffer);
            
            const imageUrl = `/uploads/partners/${filename}`;
            console.log('✅ Image uploadée localement:', imageUrl);
            res.json({ imageUrl });
            return;
        }
        
        // Upload vers Cloudinary
        console.log('☁️ Upload vers Cloudinary...');
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'image',
                    folder: 'drole-media/partners',
                    public_id: `partner_${Date.now()}`,
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
        
        const imageUrl = uploadResult.secure_url;
        console.log('✅ Image uploadée avec succès vers Cloudinary:', imageUrl);
        res.json({ imageUrl });
    } catch (error) {
        console.error('Erreur lors de l\'upload d\'image:', error);
        res.status(500).json({ message: `Erreur serveur: ${error.message}` });
    }
});

// POST /api/partners - Créer un nouveau partenaire (admin)
router.post('/', optionalAuth, authenticateAdmin, async (req, res) => {
    try {
        console.log('🔍 Création partenaire - Données reçues:', req.body);
        
        const { name, email, username, website, profileImage, description, status } = req.body;
        
        if (!name) {
            console.log('❌ Nom manquant');
            return res.status(400).json({ message: 'Le nom du partenaire est requis' });
        }
        
        if (!username) {
            console.log('❌ Username manquant');
            return res.status(400).json({ message: 'Le @ du partenaire est requis' });
        }
        
        const partner = new Partner({
            name,
            email,
            username,
            website,
            profileImage,
            description,
            status: status || 'active'
        });
        
        await partner.save();
        console.log('✅ Partenaire créé avec succès:', partner);
        res.status(201).json(partner);
    } catch (error) {
        console.error('❌ Erreur lors de la création du partenaire:', error);
        res.status(500).json({ 
            message: 'Erreur serveur',
            details: error.message 
        });
    }
});

// PUT /api/partners/:id - Mettre à jour un partenaire (admin)
router.put('/:id', optionalAuth, authenticateAdmin, async (req, res) => {
    try {
        const { name, email, username, website, profileImage, description, status } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'Le nom du partenaire est requis' });
        }
        
        if (!username) {
            return res.status(400).json({ message: 'Le @ du partenaire est requis' });
        }
        
        const partner = await Partner.findByIdAndUpdate(
            req.params.id,
            {
                name,
                email,
                username,
                website,
                profileImage,
                description,
                status,
                updatedAt: Date.now()
            },
            { new: true }
        );
        
        if (!partner) {
            return res.status(404).json({ message: 'Partenaire non trouvé' });
        }
        
        res.json(partner);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du partenaire:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// DELETE /api/partners/:id - Supprimer un partenaire (admin)
router.delete('/:id', optionalAuth, authenticateAdmin, async (req, res) => {
    try {
        const partner = await Partner.findByIdAndDelete(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ message: 'Partenaire non trouvé' });
        }
        
        res.json({ message: 'Partenaire supprimé avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression du partenaire:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// GET /api/partners/:id - Récupérer un partenaire spécifique
router.get('/:id', async (req, res) => {
    try {
        const partner = await Partner.findById(req.params.id);
        
        if (!partner) {
            return res.status(404).json({ message: 'Partenaire non trouvé' });
        }
        
        res.json(partner);
    } catch (error) {
        console.error('Erreur lors de la récupération du partenaire:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router; 