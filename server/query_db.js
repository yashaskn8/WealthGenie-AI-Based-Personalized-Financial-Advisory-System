import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env' });

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/wealthgenie';
console.log('Connecting to Mongo:', mongoURI);

await mongoose.connect(mongoURI);

const ProfileSchema = new mongoose.Schema({}, { strict: false });
const FinancialProfile = mongoose.model('FinancialProfile', ProfileSchema, 'financialprofiles');

const RecSchema = new mongoose.Schema({}, { strict: false });
const Recommendation = mongoose.model('Recommendation', RecSchema, 'recommendations');

const latestProfile = await FinancialProfile.findOne().sort({ createdAt: -1 }).lean();
console.log('Latest Profile:', JSON.stringify(latestProfile, null, 2));

if (latestProfile) {
  const latestRec = await Recommendation.findOne({ profileId: latestProfile._id }).sort({ createdAt: -1 }).lean();
  console.log('Latest Recommendation:', JSON.stringify(latestRec, null, 2));
}

await mongoose.disconnect();
