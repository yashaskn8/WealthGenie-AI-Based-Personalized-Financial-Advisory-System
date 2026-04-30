import mongoose from 'mongoose';

const MONGODB_URI = "mongodb+srv://poke511535_db_user:rPYz3w6Ap8WY2scb@cluster0.rupsdcl.mongodb.net/wealthgenie?retryWrites=true&w=majority";

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected');
    
    // Define inline schemas to avoid dependency issues
    const User = mongoose.model('User', new mongoose.Schema({ email: String }));
    const Profile = mongoose.model('FinancialProfile', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId }, { collection: 'financialprofiles' }));
    const Goal = mongoose.model('Goal', new mongoose.Schema({ userId: mongoose.Schema.Types.ObjectId }, { collection: 'goals' }));

    const userCount = await User.countDocuments();
    const profileCount = await Profile.countDocuments();
    const goalCount = await Goal.countDocuments();

    console.log(`Users: ${userCount}`);
    console.log(`Profiles: ${profileCount}`);
    console.log(`Goals: ${goalCount}`);

    const latestProfile = await Profile.findOne().sort({ createdAt: -1 });
    console.log('Latest Profile:', latestProfile);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

connectDB();
