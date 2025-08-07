const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Configuration du transporteur email (pour test)
// Pour activer l'envoi d'email, décommentez et configurez :
/*
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: 'votre-email@gmail.com', // À remplacer par votre email
        pass: 'votre-mot-de-passe-app' // Mot de passe d'application Gmail
    }
});
*/

// POST /api/auth/login - Connexion utilisateur
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email et mot de passe requis' });
        }
        
        // Rechercher l'utilisateur
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        // Générer le token JWT
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SECRET || 'drole_media_secret_key_2025',
            { expiresIn: '24h' }
        );
        
        // Retourner les données utilisateur (sans le mot de passe)
        const userResponse = {
            _id: user._id,
            email: user.email,
            isAdmin: user.isAdmin,
            createdAt: user.createdAt
        };
        
        res.json({
            token,
            user: userResponse,
            message: 'Connexion réussie'
        });
        
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/auth/register - Inscription utilisateur
router.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ message: 'Email et mot de passe requis' });
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        // Hasher le mot de passe
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Créer le nouvel utilisateur
        const newUser = new User({
            email: email.toLowerCase(),
            password: hashedPassword,
            isAdmin: false
        });
        
        await newUser.save();
        
        // Générer le token JWT
        const token = jwt.sign(
            {
                userId: newUser._id,
                email: newUser.email,
                isAdmin: newUser.isAdmin
            },
            process.env.JWT_SECRET || 'drole_media_secret_key_2025',
            { expiresIn: '24h' }
        );
        
        // Retourner les données utilisateur (sans le mot de passe)
        const userResponse = {
            _id: newUser._id,
            email: newUser.email,
            isAdmin: newUser.isAdmin,
            createdAt: newUser.createdAt
        };
        
        res.status(201).json({
            token,
            user: userResponse,
            message: 'Inscription réussie'
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/auth/forgot-password - Mot de passe oublié
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ message: 'Email requis' });
        }
        
        // Rechercher l'utilisateur
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            // Pour des raisons de sécurité, ne pas révéler si l'email existe ou non
            return res.json({ 
                message: 'Si cet email existe dans notre base de données, vous recevrez un lien de réinitialisation.' 
            });
        }
        
        // Générer un token de réinitialisation (valide 1 heure)
        const resetToken = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || 'drole_media_secret_key_2025',
            { expiresIn: '1h' }
        );
        
        // Sauvegarder le token dans la base de données (optionnel)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
        await user.save();
        
        // Pour les tests, on affiche le lien dans la console
        const resetUrl = `http://localhost:5000/reset-password?token=${resetToken}`;
        console.log(`🔗 Lien de réinitialisation pour ${email}:`);
        console.log(`   ${resetUrl}`);
        console.log(`   (Ce lien expire dans 1 heure)`);
        
        res.json({ 
            message: 'Si cet email existe dans notre base de données, vous recevrez un lien de réinitialisation.' 
        });
        
    } catch (error) {
        console.error('Erreur mot de passe oublié:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/auth/reset-password - Réinitialisation du mot de passe
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token et nouveau mot de passe requis' });
        }
        
        // Vérifier le token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'drole_media_secret_key_2025');
        
        // Rechercher l'utilisateur
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(400).json({ message: 'Token invalide' });
        }
        
        // Vérifier si le token n'a pas expiré
        if (user.resetPasswordExpires && Date.now() > user.resetPasswordExpires) {
            return res.status(400).json({ message: 'Token expiré' });
        }
        
        // Hasher le nouveau mot de passe
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Mettre à jour le mot de passe
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        
        res.json({ message: 'Mot de passe mis à jour avec succès' });
        
    } catch (error) {
        console.error('Erreur réinitialisation mot de passe:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

module.exports = router; 