import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function PUT(request: NextRequest, { params: paramsPromise }: { params: Promise<{ requestId: string }> }) {
  console.log('=== FRIEND REQUEST PUT START ===');
  const params = await paramsPromise;
  console.log('Request params:', params);
  
  try {
    console.log('=== GETTING SERVER SESSION ===');
    console.log('Request headers:', {
      cookie: request.headers.get('cookie'),
      authorization: request.headers.get('authorization'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer')
    });
    
    // Get session with proper request context
    let session;
    try {
      // For App Router, we need to pass the request and response context
      session = await getServerSession(authOptions);
      
      // If session is null, try alternative approach
      if (!session) {
        console.log('⚠️ Primary session retrieval returned null, checking cookies directly');
        const cookieHeader = request.headers.get('cookie');
        console.log('Cookie header present:', !!cookieHeader);
        if (cookieHeader) {
          console.log('Cookie header length:', cookieHeader.length);
        }
      }
    } catch (sessionError) {
      console.error('Session retrieval error:', sessionError);
      return NextResponse.json(
        { error: 'Authentication failed', details: 'Could not retrieve session' },
        { status: 401 }
      );
    }
    
    console.log('Session retrieved:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      userName: session?.user?.name,
      sessionKeys: session ? Object.keys(session) : [],
      userKeys: session?.user ? Object.keys(session.user) : []
    });
    
    if (!session?.user?.email) {
      console.log('❌ No valid session found');
      return NextResponse.json(
        { error: 'Unauthorized', details: 'No valid session or user email' },
        { status: 401 }
      )
    }

    const { requestId } = params
    const body = await request.json();
    const { action } = body;
    console.log('Request body:', { requestId, action });

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      console.log('❌ Invalid request ID:', requestId);
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      )
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      console.log('❌ Invalid action:', action);
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "reject"' },
        { status: 400 }
      )
    }

    try {
      await dbConnect();
      console.log('✅ Database connected');
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed', details: dbError instanceof Error ? dbError.message : 'Unknown database error' },
        { status: 500 }
      );
    }

    // Get current user
    let currentUser;
    try {
      currentUser = await User.findOne({ email: session.user.email });
      console.log('Current user found:', {
        hasUser: !!currentUser,
        userId: currentUser?._id,
        email: currentUser?.email,
        friendRequestsCount: currentUser?.friendRequests?.length || 0
      });
    } catch (userError) {
      console.error('Error finding current user:', userError);
      return NextResponse.json(
        { error: 'Failed to find user', details: userError instanceof Error ? userError.message : 'Unknown user lookup error' },
        { status: 500 }
      );
    }
    
    if (!currentUser) {
      console.log('❌ Current user not found in database');
      return NextResponse.json(
        { error: 'Current user not found', details: `No user found with email: ${session.user.email}` },
        { status: 404 }
      )
    }

    console.log('=== FRIEND REQUEST SEARCH START ===');
    console.log('All friend requests for user:', currentUser.friendRequests.map((req: any) => ({
      id: String(req._id),
      idType: typeof req._id,
      status: req.status,
      from: String(req.from),
      fromName: req.fromName
    })));
    
    // Find the friend request in current user's friendRequests array
    // Handle both ObjectId and string comparison more robustly
    let requestIndex = -1;
    
    // First try exact ObjectId match
    if (mongoose.Types.ObjectId.isValid(requestId)) {
      console.log('✅ RequestId is valid ObjectId, trying ObjectId matching');
      requestIndex = currentUser.friendRequests.findIndex(
        (req: any) => {
          if (!req._id) {
            console.log('❌ Request has no _id:', req);
            return false;
          }
          const reqId = req._id instanceof mongoose.Types.ObjectId ? req._id : new mongoose.Types.ObjectId(req._id);
          const searchId = new mongoose.Types.ObjectId(requestId);
          const matches = reqId.equals(searchId) && req.status === 'pending';
          console.log('ObjectId match attempt:', {
            reqId: String(reqId),
            searchId: String(searchId),
            status: req.status,
            matches
          });
          return matches;
        }
      );
      console.log('ObjectId search result index:', requestIndex);
    }
    
    // If not found, try string comparison as fallback
    if (requestIndex === -1) {
      console.log('⚠️ ObjectId match failed, trying string comparison');
      requestIndex = currentUser.friendRequests.findIndex(
        (req: any) => {
          const matches = String(req._id) === String(requestId) && req.status === 'pending';
          console.log('String match attempt:', {
            reqId: String(req._id),
            requestId: String(requestId),
            status: req.status,
            matches
          });
          return matches;
        }
      );
      console.log('String search result index:', requestIndex);
    }

    console.log('Final search result:', { 
      requestId, 
      requestIdType: typeof requestId,
      isValidObjectId: mongoose.Types.ObjectId.isValid(requestId),
      foundIndex: requestIndex,
      totalRequests: currentUser.friendRequests.length
    });
    
    if (requestIndex === -1) {
      console.log('❌ Friend request not found');
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ Friend request found at index:', requestIndex);

    const friendRequest = currentUser.friendRequests[requestIndex];
    const senderId = friendRequest.from;
    console.log('Processing friend request:', {
      requestIndex,
      senderId: String(senderId),
      action,
      requestStatus: friendRequest.status
    });

    // Get the sender user
    let senderUser;
    try {
      senderUser = await User.findById(senderId);
      console.log('Sender user lookup:', {
        senderId: String(senderId),
        foundSender: !!senderUser,
        senderEmail: senderUser?.email
      });
    } catch (senderError) {
      console.error('Error finding sender user:', senderError);
      return NextResponse.json(
        { error: 'Failed to find sender user', details: senderError instanceof Error ? senderError.message : 'Unknown sender lookup error' },
        { status: 500 }
      );
    }
    
    if (!senderUser) {
      console.log('❌ Sender user not found');
      return NextResponse.json(
        { error: 'Sender user not found', details: `No user found with ID: ${senderId}` },
        { status: 404 }
      )
    }

    console.log('Updating friend request status to:', action);
    // Update request status
    currentUser.friendRequests[requestIndex].status = action === 'accept' ? 'accepted' : 'rejected';
    currentUser.friendRequests[requestIndex].updatedAt = new Date();

    // If accepted, add each other as friends and clean up requests
    if (action === 'accept') {
      console.log('Processing acceptance: adding friends to each other\'s lists');
      
      // Add sender to current user's friends
      if (!currentUser.friends.includes(senderId)) {
        console.log('Adding sender to current user\'s friends');
        currentUser.friends.push(senderId);
      } else {
        console.log('⚠️ Sender already in current user\'s friends list');
      }
      
      // Add current user to sender's friends
      if (!senderUser.friends.includes(currentUser._id as mongoose.Types.ObjectId)) {
        console.log('Adding current user to sender\'s friends');
        senderUser.friends.push(currentUser._id as mongoose.Types.ObjectId);
      } else {
        console.log('⚠️ Current user already in sender\'s friends list');
      }
      
      // Remove the corresponding sent request from sender's sentRequests array
      console.log('Cleaning up sender\'s sent requests');
      const originalSentRequestsLength = senderUser.sentRequests?.length || 0;
      if (senderUser.sentRequests) {
        senderUser.sentRequests = senderUser.sentRequests.filter(
          (req: any) => !(req.to && req.to.equals && req.to.equals(currentUser._id))
        );
        console.log(`Removed sent request from sender: ${originalSentRequestsLength} -> ${senderUser.sentRequests.length}`);
      }

      console.log('Saving sender user changes');
      try {
        await senderUser.save();
      } catch (senderSaveError) {
        console.error('Error saving sender user:', senderSaveError);
        return NextResponse.json(
          { error: 'Failed to save sender user changes', details: senderSaveError instanceof Error ? senderSaveError.message : 'Unknown save error' },
          { status: 500 }
        );
      }
    }
    
    // Remove the processed request from current user's friendRequests array  
    console.log('Removing processed request from current user\'s friendRequests');
    currentUser.friendRequests.splice(requestIndex, 1);

    console.log('Saving current user changes');
    try {
      await currentUser.save();
    } catch (currentUserSaveError) {
      console.error('Error saving current user:', currentUserSaveError);
      return NextResponse.json(
        { error: 'Failed to save current user changes', details: currentUserSaveError instanceof Error ? currentUserSaveError.message : 'Unknown save error' },
        { status: 500 }
      );
    }

    const responseData = {
      message: `Friend request ${action}ed successfully`,
      action,
      friend: action === 'accept' ? {
        id: senderUser._id,
        username: senderUser.username,
        email: senderUser.email,
        profilePicture: senderUser.profilePicture,
      } : null
    };
    
    console.log('✅ Successfully processed friend request');
    console.log('Response data:', responseData);
    console.log('=== FRIEND REQUEST PUT END ===');
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('=== FRIEND REQUEST PUT ERROR ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Request details:', {
      params,
      method: 'PUT',
      url: request.url
    });
    console.error('=== END ERROR LOG ===');
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params: paramsPromise }: { params: Promise<{ requestId: string }> }) {
  try {
    const params = await paramsPromise;
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { requestId } = params

    if (!requestId || !mongoose.Types.ObjectId.isValid(requestId)) {
      return NextResponse.json(
        { error: 'Invalid request ID' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Current user not found' },
        { status: 404 }
      )
    }

    // Remove from current user's sentRequests array
    const initialSentLength = currentUser.sentRequests.length;
    
    currentUser.sentRequests = currentUser.sentRequests.filter(
      (req: any) => {
        if (!req._id) return true; // Keep requests without IDs
        
        // Try ObjectId comparison first
        if (mongoose.Types.ObjectId.isValid(requestId)) {
          try {
            const reqId = req._id instanceof mongoose.Types.ObjectId ? req._id : new mongoose.Types.ObjectId(req._id);
            const searchId = new mongoose.Types.ObjectId(requestId);
            return !reqId.equals(searchId); // Keep if NOT equal (filter out the matching one)
          } catch (error) {
            // Fall through to string comparison
          }
        }
        
        // Fallback to string comparison
        return String(req._id) !== String(requestId); // Keep if NOT equal
      }
    );
    
    const finalSentLength = currentUser.sentRequests.length;
    
    if (initialSentLength === finalSentLength) {
      return NextResponse.json(
        { error: 'Friend request not found in sent requests' },
        { status: 404 }
      )
    }

    // Also find and remove from target user's received requests
    const targetUser = await User.findOne({
      'friendRequests.from': currentUser._id,
      'friendRequests.status': 'pending'
    })

    if (targetUser) {
      targetUser.friendRequests = targetUser.friendRequests.filter(
        (req: any) => {
          if (!req._id) return true;
          
          if (mongoose.Types.ObjectId.isValid(requestId)) {
            try {
              const reqId = req._id instanceof mongoose.Types.ObjectId ? req._id : new mongoose.Types.ObjectId(req._id);
              const searchId = new mongoose.Types.ObjectId(requestId);
              return !reqId.equals(searchId);
            } catch (error) {
              // Fall through to string comparison
            }
          }
          
          return String(req._id) !== String(requestId);
        }
      );
      
      await targetUser.save();
    }

    await currentUser.save()

    return NextResponse.json({
      message: 'Friend request canceled successfully'
    })

  } catch (error) {
    console.error('Error canceling friend request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
