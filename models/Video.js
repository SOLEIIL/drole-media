const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  s3Url: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  status: { type: String, enum: ['pending', 'validated', 'rejected'], default: 'pending' },
  submittedAt: { type: Date, default: Date.now },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }, // Pour les vidéos anonymes existantes
  rejectionReason: { type: String }, // Raison du rejet si applicable
  validatedAt: { type: Date }, // Date de validation
  rejectedAt: { type: Date }, // Date de rejet
  
                // Nouveaux champs pour les droits d'auteur et propriété
              recordedVideo: { type: String, enum: ['yes', 'no'] }, // Avez-vous enregistré la vidéo ?
              copyrightOwnership: { type: String, enum: ['yes', 'no'] }, // Possédez-vous les droits d'auteur ?
              termsAgreement: { type: Boolean }, // Accord des conditions
              signature: { type: String }, // Signature de l'utilisateur
              recorderEmail: { type: String }, // Email de l'enregistreur (si différent)
              ownerEmail: { type: String }, // Email du propriétaire (si différent)
              userEmail: { type: String } // Email de l'utilisateur qui soumet la vidéo
});

module.exports = mongoose.model('Video', videoSchema);