const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Video = require('../models/Video');
const Admin = require('../models/Admin');
const router = express.Router();

// Middleware pour vérifier le token JWT
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token d\'accès requis' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'drole_media_secret_key_2025', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// Inscription d'un nouvel utilisateur
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation des données
        if (!name || !email || !password || !confirmPassword) {
            return res.status(400).json({ error: 'Tous les champs sont requis' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Les mots de passe ne correspondent pas' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
        }

        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Cet email est déjà utilisé' });
        }

        // Créer le nouvel utilisateur
        const user = new User({
            name,
            email: email.toLowerCase(),
            password
        });

        await user.save();

        // Générer un token JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email, isAdmin: user.isAdmin },
            process.env.JWT_SECRET || 'drole_media_secret_key_2025',
            { expiresIn: '24h' }
        );

        res.status(201).json({
            message: 'Compte créé avec succès',
            token,
            user: user.toPublicJSON()
        });
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Connexion d'un utilisateur
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email et mot de passe requis' });
        }

        // Essayer d'abord de trouver un utilisateur normal
        const user = await User.findOne({ email: email.toLowerCase() });
        if (user) {
            const isPasswordValid = await user.comparePassword(password);
            if (isPasswordValid) {
                // Mettre à jour la date de dernière connexion
                user.lastLogin = new Date();
                await user.save();

                // Générer un token JWT
                const token = jwt.sign(
                    { userId: user._id, email: user.email, isAdmin: user.isAdmin },
                    process.env.JWT_SECRET || 'drole_media_secret_key_2025',
                    { expiresIn: '24h' }
                );

                return res.json({
                    message: 'Connexion réussie',
                    token,
                    user: user.toPublicJSON()
                });
            }
        }

        // Si pas trouvé dans User, essayer dans Admin (pour compatibilité)
        const admin = await Admin.findOne({ username: email });
        if (admin && admin.password === password) {
            const token = jwt.sign(
                { adminId: admin._id, username: admin.username, isAdmin: true },
                process.env.JWT_SECRET || 'drole_media_secret_key_2025',
                { expiresIn: '24h' }
            );

            return res.json({
                message: 'Connexion admin réussie',
                token,
                user: { name: admin.username, isAdmin: true, email: admin.username }
            });
        }

        // Aucune correspondance trouvée
        res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Obtenir les vidéos de l'utilisateur connecté
router.get('/my-videos', authenticateToken, async (req, res) => {
    try {
        const videos = await Video.find({ user: req.user.userId })
            .populate('category', 'name')
            .sort({ submittedAt: -1 });

        const stats = {
            total: videos.length,
            approved: videos.filter(v => v.status === 'validated').length,
            pending: videos.filter(v => v.status === 'pending').length,
            rejected: videos.filter(v => v.status === 'rejected').length
        };

        res.json({ videos, stats });
    } catch (error) {
        console.error('Erreur lors de la récupération des vidéos:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Supprimer une vidéo de l'utilisateur
router.delete('/my-videos/:id', authenticateToken, async (req, res) => {
    try {
        const video = await Video.findOne({ _id: req.params.id, user: req.user.userId });
        
        if (!video) {
            return res.status(404).json({ error: 'Vidéo non trouvée ou vous n\'êtes pas autorisé à la supprimer' });
        }

        await Video.findByIdAndDelete(req.params.id);
        res.json({ message: 'Vidéo supprimée avec succès' });
    } catch (error) {
        console.error('Erreur lors de la suppression:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Vérifier la validité du token
router.get('/verify', authenticateToken, async (req, res) => {
    try {
        if (req.user.adminId) {
            // Token admin
            return res.json({ 
                valid: true, 
                user: { name: req.user.username, isAdmin: true }
            });
        }

        // Token utilisateur
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        res.json({ 
            valid: true, 
            user: user.toPublicJSON()
        });
    } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Sauvegarder les informations de paiement
router.post('/payment-info', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Début de la sauvegarde des informations de paiement');
        console.log('🔍 User ID:', req.user.userId);
        console.log('🔍 Body reçu:', req.body);
        
        const {
            paymentMethod,
            paypalEmail,
            ibanNumber,
            bankName,
            accountHolder,
            bicCode,
            cryptoType,
            cryptoAddress,
            fullName,
            taxId
        } = req.body;

        console.log('💳 Informations de paiement reçues:', req.body);

        // Validation de base
        if (!paymentMethod) {
            return res.status(400).json({ error: 'Méthode de paiement requise' });
        }

        // Validation selon la méthode de paiement
        if (paymentMethod === 'paypal' && !paypalEmail) {
            return res.status(400).json({ error: 'Adresse email PayPal requise' });
        }

        if (paymentMethod === 'iban' && (!ibanNumber || !bankName || !accountHolder)) {
            return res.status(400).json({ error: 'IBAN, nom de banque et titulaire du compte requis' });
        }

        if (paymentMethod === 'crypto' && (!cryptoType || !cryptoAddress)) {
            return res.status(400).json({ error: 'Type de cryptomonnaie et adresse de wallet requis' });
        }

        // Trouver l'utilisateur et mettre à jour ses informations de paiement
        console.log('🔍 Recherche de l\'utilisateur avec ID:', req.user.userId);
        const user = await User.findById(req.user.userId);
        if (!user) {
            console.log('❌ Utilisateur non trouvé avec ID:', req.user.userId);
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        console.log('✅ Utilisateur trouvé:', user.email);

        // Préparer les informations de paiement
        const paymentInfo = {
            paymentMethod,
            paypalEmail,
            ibanNumber,
            bankName,
            accountHolder,
            bicCode,
            cryptoType,
            cryptoAddress,
            fullName,
            taxId
        };
        
        console.log('🔍 Informations de paiement à sauvegarder:', paymentInfo);

        // Mettre à jour les informations de paiement
        user.paymentInfo = paymentInfo;

        console.log('🔍 Sauvegarde de l\'utilisateur...');
        await user.save();
        console.log('✅ Utilisateur sauvegardé avec succès');

        console.log('✅ Informations de paiement sauvegardées pour l\'utilisateur:', user.email);

        res.json({
            message: 'Informations de paiement sauvegardées avec succès',
            paymentInfo: user.paymentInfo
        });
    } catch (error) {
        console.error('❌ Erreur sauvegarde paiement:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

// Récupérer les informations de paiement
router.get('/payment-info', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        console.log('💳 Informations de paiement récupérées pour l\'utilisateur:', user.email);

        res.json({
            paymentInfo: user.paymentInfo || {}
        });
    } catch (error) {
        console.error('❌ Erreur récupération paiement:', error);
        res.status(500).json({ error: 'Erreur interne du serveur' });
    }
});

module.exports = router;