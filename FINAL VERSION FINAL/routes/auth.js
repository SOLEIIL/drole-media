const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

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
            console.log(`❌ Connexion échouée: utilisateur ${email} non trouvé`);
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        console.log(`🔍 Tentative de connexion pour: ${user.email}`);
        console.log(`🔑 Hash en base: [HIDDEN]`);
        
        // Vérifier le mot de passe
        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        console.log(`🔐 Mot de passe valide: ${isPasswordValid}`);
        
        if (!isPasswordValid) {
            console.log(`❌ Connexion échouée: mot de passe incorrect pour ${user.email}`);
            return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
        }
        
        // Vérifier que l'email est vérifié
        if (!user.emailVerified) {
            console.log(`❌ Connexion échouée: email non vérifié pour ${user.email}`);
            
            // Vérifier si c'est la première tentative de connexion (pas de token existant)
            if (!user.emailVerificationToken) {
                console.log('📧 Première tentative de connexion - Envoi du premier email de vérification');
                
                // Créer un nouveau token de vérification et envoyer un email
                const crypto = require('crypto');
                const verificationToken = crypto.randomBytes(32).toString('hex');
                const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
                
                user.emailVerificationToken = verificationToken;
                user.emailVerificationExpires = verificationExpires;
                user.lastVerificationEmailSent = new Date();
                await user.save();
                
                // Envoyer le premier email de vérification
                const verificationUrl = `${process.env.BASE_URL || 'https://drolemedia.com'}/verify-email?token=${verificationToken}`;
                
                const mailOptions = {
                    from: process.env.EMAIL_USER || 'u0072585458@gmail.com',
                    to: user.email,
                    subject: 'Vérification de votre compte - DROLE MEDIA',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0;">DROLE MEDIA</h1>
                            </div>
                            <div style="padding: 30px; background: #f8f9fa;">
                                <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${user.name} !</h2>
                                <p style="color: #666; line-height: 1.6;">
                                    Pour des raisons de sécurité, nous devons vérifier votre adresse email. 
                                    Veuillez confirmer votre compte en cliquant sur le bouton ci-dessous.
                                </p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${verificationUrl}" 
                                       style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                        Vérifier mon compte
                                    </a>
                                </div>
                                <p style="color: #666; font-size: 14px;">
                                    Ce lien expirera dans 24 heures.
                                </p>
                                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                                <p style="color: #999; font-size: 12px; text-align: center;">
                                    DROLE MEDIA - Protéger, Partager, Gagner
                                </p>
                            </div>
                        </div>
                    `
                };
                
                try {
                    await transporter.sendMail(mailOptions);
                    console.log('✅ Premier email de vérification envoyé à:', user.email);
                } catch (emailError) {
                    console.error('❌ Erreur envoi email de vérification:', emailError);
                }
                
                return res.status(401).json({ 
                    message: 'Veuillez vérifier votre email avant de vous connecter. Vérifiez votre boîte de réception.',
                    needsVerification: true,
                    firstAttempt: true
                });
            } else {
                console.log('🔄 Tentative de connexion suivante - Pas d\'envoi d\'email automatique');
                
                return res.status(401).json({ 
                    message: 'Veuillez vérifier votre email avant de vous connecter. Utilisez le bouton "Renvoyer l\'email" si nécessaire.',
                    needsVerification: true,
                    firstAttempt: false
                });
            }
        }
        
        // Mettre à jour la dernière connexion
        user.lastLogin = new Date();
        await user.save();
        
        // Générer le token JWT
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                isAdmin: user.isAdmin
            },
            process.env.JWT_SECRET,
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

// POST /api/auth/register - Inscription utilisateur avec vérification email
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Nom, email et mot de passe requis' });
        }
        
        // Validation de la force du mot de passe côté serveur
        let score = 0;
        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        
        if (score < 3) {
            return res.status(400).json({ 
                message: 'Le mot de passe doit être au moins de force moyenne (3/5). Veuillez choisir un mot de passe plus sécurisé.' 
            });
        }
        
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        
        if (existingUser) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
        }
        
        // Générer un token de vérification
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
        
        // Créer le nouvel utilisateur (non vérifié)
        const newUser = new User({
            name: name,
            email: email.toLowerCase(),
            password: password, // Sera hashé automatiquement par le middleware
            isAdmin: false,
            emailVerified: false,
            emailVerificationToken: verificationToken,
            emailVerificationExpires: verificationExpires
        });
        
        await newUser.save();
        
        // Envoyer l'email de vérification
        const verificationUrl = `${process.env.BASE_URL || 'https://drolemedia.com'}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'u0072585458@gmail.com',
            to: email,
            subject: 'Confirmez votre inscription - DROLE MEDIA',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">DROLE MEDIA</h1>
                    </div>
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333; margin-bottom: 20px;">Bienvenue ${name} !</h2>
                        <p style="color: #666; line-height: 1.6;">
                            Merci de vous être inscrit sur DROLE MEDIA. Pour finaliser votre inscription, 
                            veuillez confirmer votre adresse email en cliquant sur le bouton ci-dessous.
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Confirmer mon inscription
                            </a>
                        </div>
                        <p style="color: #666; font-size: 14px;">
                            Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte sur DROLE MEDIA, 
                            vous pouvez ignorer cet email.
                        </p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            DROLE MEDIA - Protéger, Partager, Gagner
                        </p>
                    </div>
                </div>
            `
        };
        
        try {
            await transporter.sendMail(mailOptions);
            console.log('✅ Email de vérification envoyé à:', email);
        } catch (emailError) {
            console.error('❌ Erreur envoi email de vérification:', emailError);
            // Supprimer l'utilisateur si l'email ne peut pas être envoyé
            await User.findByIdAndDelete(newUser._id);
            return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email de vérification' });
        }
        
        res.status(201).json({
            message: 'Inscription réussie ! Veuillez vérifier votre email pour confirmer votre compte.',
            email: email
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'inscription:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/auth/verify-email - Vérifier l'email
router.post('/verify-email', async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'Token de vérification requis' });
        }
        
        // Rechercher l'utilisateur avec ce token
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: new Date() }
        });
        
        if (!user) {
            // Vérifier si le token a expiré
            const expiredUser = await User.findOne({ emailVerificationToken: token });
            if (expiredUser) {
                // Supprimer l'utilisateur expiré
                await User.findByIdAndDelete(expiredUser._id);
                return res.status(400).json({ error: 'TOKEN_EXPIRED' });
            }
            return res.status(400).json({ error: 'Token de vérification invalide' });
        }
        
        // Marquer l'utilisateur comme vérifié
        user.emailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();
        
        console.log('✅ Email vérifié pour:', user.email);
        
        res.json({
            message: 'Email vérifié avec succès ! Vous pouvez maintenant vous connecter.',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                emailVerified: user.emailVerified
            }
        });
        
    } catch (error) {
        console.error('Erreur lors de la vérification email:', error);
        res.status(500).json({ error: 'Erreur serveur' });
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
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        // Sauvegarder le token dans la base de données (optionnel)
        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 heure
        await user.save();
        
        // Envoyer l'email de réinitialisation
        const resetUrl = `${process.env.BASE_URL || 'https://drole-media-app-2a7429d02317.herokuapp.com'}/reset-password?token=${resetToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'DROLE Media - Réinitialisation de votre mot de passe',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 28px;">DROLE Media</h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Réinitialisation de mot de passe</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-bottom: 20px;">Bonjour !</h2>
                        
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            Vous avez demandé la réinitialisation de votre mot de passe pour votre compte DROLE Media.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
                                Réinitialiser mon mot de passe
                            </a>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            <strong>⚠️ Important :</strong> Ce lien expire dans <strong>1 heure</strong> pour des raisons de sécurité.
                        </p>
                        
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
                        
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            Cet email a été envoyé automatiquement. Ne répondez pas à cet email.<br>
                                                         Pour toute question, contactez-nous à <a href="mailto:u0072585458@gmail.com" style="color: #667eea;">u0072585458@gmail.com</a>
                        </p>
                    </div>
                </div>
            `
        };
        
        try {
            await transporter.sendMail(mailOptions);
            console.log(`📧 Email de réinitialisation envoyé à ${email}`);
        } catch (emailError) {
            console.error('Erreur envoi email:', emailError);
            // En cas d'erreur d'envoi, on affiche quand même le lien dans la console
            console.log(`🔗 Lien de réinitialisation pour ${email}:`);
            console.log(`   ${resetUrl}`);
        }
        
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
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Rechercher l'utilisateur
        const user = await User.findById(decoded.userId);
        
        if (!user) {
            return res.status(400).json({ message: 'Token invalide' });
        }
        
        // Vérifier si le token n'a pas expiré
        if (user.resetPasswordExpires && Date.now() > user.resetPasswordExpires) {
            return res.status(400).json({ message: 'Token expiré' });
        }
        
        console.log(`🔑 Réinitialisation mot de passe pour: ${user.email}`);
        console.log(`🔄 Ancien hash: [HIDDEN]`);
        
        // Mettre à jour le mot de passe (sera hashé automatiquement par le middleware pre('save'))
        user.password = newPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        
        const updatedUser = await user.save();
        console.log(`✅ Mot de passe mis à jour en base pour: ${updatedUser.email}`);
        console.log(`🔑 Hash final en base: [HIDDEN]`);
        
        res.json({ message: 'Mot de passe mis à jour avec succès' });
        
    } catch (error) {
        console.error('Erreur réinitialisation mot de passe:', error);
        res.status(500).json({ message: 'Erreur serveur' });
    }
});

// POST /api/auth/resend-verification - Renvoyer l'email de vérification
router.post('/resend-verification', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email requis' });
        }
        
        // Rechercher l'utilisateur
        const user = await User.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        
        // Vérifier si l'utilisateur est déjà vérifié
        if (user.emailVerified) {
            return res.status(400).json({ error: 'Cet email est déjà vérifié' });
        }
        
        // Vérifier si un email a été envoyé récemment (dans les 60 secondes)
        const lastEmailSent = user.lastVerificationEmailSent;
        if (lastEmailSent && Date.now() - lastEmailSent.getTime() < 60000) {
            const remainingTime = Math.ceil((60000 - (Date.now() - lastEmailSent.getTime())) / 1000);
            return res.status(429).json({ 
                error: `Veuillez attendre ${remainingTime} secondes avant de renvoyer un email`,
                remainingTime
            });
        }
        
        // Générer un nouveau token de vérification
        const crypto = require('crypto');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
        
        // Mettre à jour l'utilisateur
        user.emailVerificationToken = verificationToken;
        user.emailVerificationExpires = verificationExpires;
        user.lastVerificationEmailSent = new Date();
        await user.save();
        
        // Envoyer l'email de vérification
        const verificationUrl = `${process.env.BASE_URL || 'https://drolemedia.com'}/verify-email?token=${verificationToken}`;
        
        const mailOptions = {
            from: process.env.EMAIL_USER || 'u0072585458@gmail.com',
            to: email,
            subject: 'Renvoyé - Confirmez votre inscription - DROLE MEDIA',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">DROLE MEDIA</h1>
                    </div>
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${user.name} !</h2>
                        <p style="color: #666; line-height: 1.6;">
                            Vous avez demandé un nouveau lien de vérification. Voici votre nouveau lien pour confirmer votre inscription :
                        </p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" 
                               style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                Confirmer mon inscription
                            </a>
                        </div>
                        <p style="color: #666; font-size: 14px;">
                            Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte sur DROLE MEDIA, 
                            vous pouvez ignorer cet email.
                        </p>
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                        <p style="color: #999; font-size: 12px; text-align: center;">
                            DROLE MEDIA - Protéger, Partager, Gagner
                        </p>
                    </div>
                </div>
            `
        };
        
        try {
            await transporter.sendMail(mailOptions);
            console.log('✅ Email de vérification renvoyé à:', email);
        } catch (emailError) {
            console.error('❌ Erreur envoi email de vérification:', emailError);
            return res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
        }
        
        res.json({
            message: 'Email de vérification renvoyé avec succès',
            email: email
        });
        
    } catch (error) {
        console.error('Erreur lors du renvoi de vérification:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// POST /api/auth/force-verification - Forcer la vérification pour tous les utilisateurs existants
router.post('/force-verification', async (req, res) => {
    try {
        // Trouver tous les utilisateurs non vérifiés
        const unverifiedUsers = await User.find({ 
            emailVerified: { $ne: true } 
        });
        
        console.log(`🔍 Trouvé ${unverifiedUsers.length} utilisateurs non vérifiés`);
        
        for (const user of unverifiedUsers) {
            // Générer un nouveau token de vérification
            const crypto = require('crypto');
            const verificationToken = crypto.randomBytes(32).toString('hex');
            const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
            
            user.emailVerified = false;
            user.emailVerificationToken = verificationToken;
            user.emailVerificationExpires = verificationExpires;
            await user.save();
            
            // Envoyer l'email de vérification
            const verificationUrl = `${process.env.BASE_URL || 'https://drolemedia.com'}/verify-email?token=${verificationToken}`;
            
            const mailOptions = {
                from: process.env.EMAIL_USER || 'u0072585458@gmail.com',
                to: user.email,
                subject: 'Vérification obligatoire de votre compte - DROLE MEDIA',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0;">DROLE MEDIA</h1>
                        </div>
                        <div style="padding: 30px; background: #f8f9fa;">
                            <h2 style="color: #333; margin-bottom: 20px;">Bonjour ${user.name} !</h2>
                            <p style="color: #666; line-height: 1.6;">
                                Pour des raisons de sécurité, nous devons vérifier votre adresse email. 
                                <strong>Vous ne pourrez plus vous connecter sans vérifier votre email.</strong>
                            </p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${verificationUrl}" 
                                   style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                                    Vérifier mon compte maintenant
                                </a>
                            </div>
                            <p style="color: #666; font-size: 14px;">
                                Ce lien expirera dans 24 heures. Si vous ne vérifiez pas votre email, 
                                vous devrez créer un nouveau compte.
                            </p>
                            <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                            <p style="color: #999; font-size: 12px; text-align: center;">
                                DROLE MEDIA - Protéger, Partager, Gagner
                            </p>
                        </div>
                    </div>
                `
            };
            
            try {
                await transporter.sendMail(mailOptions);
                console.log(`✅ Email de vérification forcée envoyé à: ${user.email}`);
            } catch (emailError) {
                console.error(`❌ Erreur envoi email à ${user.email}:`, emailError);
            }
        }
        
        res.json({ 
            message: `Vérification forcée appliquée à ${unverifiedUsers.length} utilisateurs`,
            count: unverifiedUsers.length
        });
        
    } catch (error) {
        console.error('Erreur lors de la vérification forcée:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

module.exports = router; 