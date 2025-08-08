require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function changeAdminEmail() {
    try {
        console.log('🔗 Connexion à MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connecté à MongoDB');
        
        // Chercher l'admin
        const admin = await User.findOne({ isAdmin: true });
        
        if (admin) {
            console.log(`📧 Admin trouvé: ${admin.email}`);
            console.log('🔄 Changement de l\'email vers engue.txs@gmail.com...');
            
            admin.email = 'engue.txs@gmail.com';
            await admin.save();
            
            console.log('✅ Email admin changé avec succès vers engue.txs@gmail.com');
        } else {
            console.log('❌ Aucun admin trouvé dans la base de données');
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Déconnecté de MongoDB');
        process.exit(0);
    }
}

changeAdminEmail();
