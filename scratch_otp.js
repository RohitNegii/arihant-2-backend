const mongoose = require('mongoose');

async function main() {
  const email = process.argv[2] || 'testuser@example.com';
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/aurum-jewelry');

    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
      email: String,
      otpCode: String
    }));

    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      console.log(`OTP for ${email}: ${user.otpCode}`);
    } else {
      console.log(`User not found for ${email}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.connection.close();
  }
}

main();
