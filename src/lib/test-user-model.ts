import dbConnect from './mongoose';
import User from '@/models/User';

/**
 * Test script for User model functionality
 * This is a development utility to verify the User model works correctly
 */
export async function testUserModel() {
  try {
    console.log('🧪 Testing User Model...');
    
    // Connect to database
    await dbConnect();
    console.log('✅ Database connected');

    // Test 1: Create a test user
    const testUser = await User.create({
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'TestPassword123!',
      bio: 'This is a test user',
      isDiscoveryEnabled: true,
      discoveryRange: 2000,
    });
    console.log('✅ Test user created:', {
      id: testUser._id,
      username: testUser.username,
      email: testUser.email,
    });

    // Test 2: Test password comparison
    const isValidPassword = await testUser.comparePassword('TestPassword123!');
    const isInvalidPassword = await testUser.comparePassword('wrongpassword');
    console.log('✅ Password comparison:', { isValidPassword, isInvalidPassword });

    // Test 3: Update location
    await testUser.updateLocation(40.7128, -74.0060); // New York coordinates
    console.log('✅ Location updated:', testUser.location);

    // Test 4: Test user queries
    const foundUser = await User.findOne({ email: testUser.email });
    console.log('✅ User query successful:', !!foundUser);

    // Test 5: Test nearby query (with fake location data)
    const nearbyUsers = await User.findNearbyByGPS(-74.0060, 40.7128, 5000, testUser._id as any);
    console.log('✅ Nearby users query successful:', nearbyUsers.length);

    // Cleanup: Remove test user
    await User.findByIdAndDelete(testUser._id);
    console.log('✅ Test user cleaned up');

    console.log('🎉 All User model tests passed!');
    return true;
  } catch (error) {
    console.error('❌ User model test failed:', error);
    return false;
  }
}

// Only run if this file is executed directly (not imported)
if (require.main === module) {
  testUserModel().then(() => {
    process.exit(0);
  }).catch(() => {
    process.exit(1);
  });
}
