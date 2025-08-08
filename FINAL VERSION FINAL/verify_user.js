const mongoose = require('mongoose');
const User = require('./models/User');

async function verifyUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');
        
        const user = await User.findOne({email: 'engue.pro@gmail.com'});
        
        if (user) {
            console.log('User found:', user.email);
            console.log('Current emailVerified:', user.emailVerified);
            
            // Manually verify the user
            user.emailVerified = true;
            user.emailVerificationToken = undefined;
            user.emailVerificationExpires = undefined;
            await user.save();
            
            console.log('User manually verified!');
            console.log('New emailVerified:', user.emailVerified);
        } else {
            console.log('User not found');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

verifyUser();
