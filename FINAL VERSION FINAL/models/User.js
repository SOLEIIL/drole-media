const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 50
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    // Informations de paiement
    paymentInfo: {
        paymentMethod: {
            type: String,
            enum: ['paypal', 'iban', 'crypto'],
            default: 'paypal'
        },
        paypalEmail: {
            type: String,
            trim: true
        },
        ibanNumber: {
            type: String,
            trim: true
        },
        bankName: {
            type: String,
            trim: true
        },
        accountHolder: {
            type: String,
            trim: true
        },
        bicCode: {
            type: String,
            trim: true
        },
        cryptoType: {
            type: String,
            enum: ['btc', 'eth', 'sol', 'usdt', 'usdc']
        },
        cryptoAddress: {
            type: String,
            trim: true
        },
        fullName: {
            type: String,
            trim: true
        },
        taxId: {
            type: String,
            trim: true
        }
    }
});

// Hash password avant sauvegarde
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const saltRounds = 12;
        this.password = await bcrypt.hash(this.password, saltRounds);
        next();
    } catch (error) {
        next(error);
    }
});

// Méthode pour comparer les mots de passe
userSchema.methods.comparePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

// Méthode pour obtenir les informations publiques de l'utilisateur
userSchema.methods.toPublicJSON = function() {
    return {
        _id: this._id,
        name: this.name,
        email: this.email,
        isAdmin: this.isAdmin,
        createdAt: this.createdAt,
        lastLogin: this.lastLogin
    };
};

module.exports = mongoose.model('User', userSchema);