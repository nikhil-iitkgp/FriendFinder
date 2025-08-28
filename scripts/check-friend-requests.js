const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

// User schema (simplified)
const UserSchema = new mongoose.Schema({
  username: String,
  email: String,
  friendRequests: [{
    _id: mongoose.Schema.Types.ObjectId,
    from: mongoose.Schema.Types.ObjectId,
    fromName: String,
    fromAvatar: String,
    to: mongoose.Schema.Types.ObjectId,
    status: String,
    createdAt: Date,
    updatedAt: Date,
  }],
  sentRequests: [{
    _id: mongoose.Schema.Types.ObjectId,
    from: mongoose.Schema.Types.ObjectId,
    fromName: String,
    fromAvatar: String,
    to: mongoose.Schema.Types.ObjectId,
    toName: String,
    status: String,
    createdAt: Date,
    updatedAt: Date,
  }]
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function checkFriendRequests() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find your user (assuming you're using test@example.com)
    const currentUser = await User.findOne({ email: 'test@example.com' });
    if (!currentUser) {
      console.log('❌ Current user not found');
      return;
    }

    console.log('✅ Found current user:', {
      id: currentUser._id,
      username: currentUser.username,
      email: currentUser.email
    });

    console.log('\n=== FRIEND REQUESTS ANALYSIS ===');
    console.log('Friend requests count:', currentUser.friendRequests?.length || 0);
    console.log('Sent requests count:', currentUser.sentRequests?.length || 0);

    if (currentUser.friendRequests && currentUser.friendRequests.length > 0) {
      console.log('\n--- RECEIVED REQUESTS ---');
      currentUser.friendRequests.forEach((req, index) => {
        console.log(`Request ${index + 1}:`, {
          id: req._id,
          from: req.from,
          fromName: req.fromName,
          status: req.status,
          createdAt: req.createdAt,
          hasValidId: mongoose.Types.ObjectId.isValid(req._id),
          hasValidFrom: mongoose.Types.ObjectId.isValid(req.from)
        });
      });
    }

    if (currentUser.sentRequests && currentUser.sentRequests.length > 0) {
      console.log('\n--- SENT REQUESTS ---');
      currentUser.sentRequests.forEach((req, index) => {
        console.log(`Sent Request ${index + 1}:`, {
          id: req._id,
          to: req.to,
          toName: req.toName,
          status: req.status,
          createdAt: req.createdAt,
          hasValidId: mongoose.Types.ObjectId.isValid(req._id),
          hasValidTo: mongoose.Types.ObjectId.isValid(req.to)
        });
      });
    }

    // Find nikhilrajiitkgp user
    const nikhilUser = await User.findOne({ username: 'nikhilrajiitkgp' });
    if (nikhilUser) {
      console.log('\n=== NIKHIL USER ANALYSIS ===');
      console.log('Nikhil user found:', {
        id: nikhilUser._id,
        username: nikhilUser.username,
        email: nikhilUser.email
      });

      console.log('Nikhil sent requests count:', nikhilUser.sentRequests?.length || 0);
      if (nikhilUser.sentRequests && nikhilUser.sentRequests.length > 0) {
        console.log('\n--- NIKHIL SENT REQUESTS ---');
        nikhilUser.sentRequests.forEach((req, index) => {
          console.log(`Sent Request ${index + 1}:`, {
            id: req._id,
            to: req.to,
            toName: req.toName,
            status: req.status,
            createdAt: req.createdAt,
            isToCurrentUser: req.to?.toString() === currentUser._id.toString()
          });
        });
      }
    } else {
      console.log('❌ Nikhil user not found');
    }

    // Check for any pending requests between these users
    console.log('\n=== CROSS-REFERENCE CHECK ===');
    const pendingFromNikhil = currentUser.friendRequests?.filter(req => 
      req.fromName === 'nikhilrajiitkgp' && req.status === 'pending'
    );
    console.log('Pending requests from Nikhil to current user:', pendingFromNikhil?.length || 0);

    if (pendingFromNikhil && pendingFromNikhil.length > 0) {
      console.log('Found pending request from Nikhil:', pendingFromNikhil[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

checkFriendRequests();
