const mongoose = require('mongoose');
const User = require('./models/User');

async function checkTestUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const user = await User.findOne({email: 'test@example.com'});
        
        if (user) {
            console.log('User found:', user.email);
            console.log('Email verified:', user.emailVerified);
            console.log('Verification token exists:', !!user.emailVerificationToken);
            console.log('Verification expires:', user.emailVerificationExpires);
            console.log('Last verification email sent:', user.lastVerificationEmailSent);
        } else {
            console.log('User not found');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkTestUser();
