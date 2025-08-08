const fetch = require('node-fetch');

async function forceVerification() {
    try {
        console.log('🔄 Démarrage de la vérification forcée...');
        
        const response = await fetch('https://drolemedia.com/api/auth/force-verification', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (response.ok) {
            console.log('✅ Vérification forcée réussie !');
            console.log(`📧 ${result.count} utilisateurs ont reçu un email de vérification`);
            console.log('📝 Message:', result.message);
        } else {
            console.error('❌ Erreur lors de la vérification forcée:', result);
        }
        
    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Exécuter le script
forceVerification();
