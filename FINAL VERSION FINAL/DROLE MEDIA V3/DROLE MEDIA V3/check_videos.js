require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Video = require('./models/Video');
  const videos = await Video.find({});
  
  console.log('📹 Vidéos dans la base de données:');
  videos.forEach(v => {
    console.log(`- ${v.title}: ${v.s3Url}`);
  });
  
  mongoose.connection.close();
});
