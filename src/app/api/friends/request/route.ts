import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { targetUserId } = await request.json()

    if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid target user ID' },
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

    // Get target user
    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Check if trying to send request to self
    if ((currentUser._id as mongoose.Types.ObjectId).equals(targetUser._id as mongoose.Types.ObjectId)) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      )
    }

    // Check if already friends
    if (currentUser.isFriendWith(targetUser._id as mongoose.Types.ObjectId)) {
      return NextResponse.json(
        { error: 'Already friends with this user' },
        { status: 400 }
      )
    }

    // Check if already has pending request from current user to target
    if (currentUser.hasPendingRequestTo(targetUser._id as mongoose.Types.ObjectId)) {
      return NextResponse.json(
        { error: 'Friend request already sent' },
        { status: 400 }
      )
    }

    // Check if current user has pending request from target (reverse direction)
    if (currentUser.hasPendingRequestFrom(targetUser._id as mongoose.Types.ObjectId)) {
      return NextResponse.json(
        { error: 'This user has already sent you a friend request. Check your pending requests.' },
        { status: 400 }
      )
    }

    // Send friend request - add to target user's friendRequests (received) and current user's sentRequests
    const newFriendRequest = {
      _id: new mongoose.Types.ObjectId(), // Explicitly create ObjectId
      from: currentUser._id as mongoose.Types.ObjectId,
      fromName: currentUser.username,
      fromAvatar: currentUser.profilePicture,
      to: targetUser._id as mongoose.Types.ObjectId,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log('Creating friend request with ID:', newFriendRequest._id.toString());
    
    // Add to target user's received requests
    targetUser.friendRequests.push(newFriendRequest as any);
    await targetUser.save();
    
    // Also add to current user's sent requests for tracking
    const sentRequest = {
      _id: newFriendRequest._id,
      from: currentUser._id as mongoose.Types.ObjectId,
      fromName: currentUser.username,
      fromAvatar: currentUser.profilePicture,
      to: targetUser._id as mongoose.Types.ObjectId,
      toName: targetUser.username,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    currentUser.sentRequests.push(sentRequest as any);
    await currentUser.save();
    
    console.log('Friend request saved successfully');

    return NextResponse.json({
      message: 'Friend request sent successfully',
      requestId: newFriendRequest._id.toString(),
      targetUser: {
        id: targetUser._id,
        username: targetUser.username,
        profilePicture: targetUser.profilePicture,
      }
    })

  } catch (error) {
    console.error('Error sending friend request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('=== FRIEND REQUEST GET START ===')
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      console.log('❌ No session found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'received' // 'sent' or 'received'
    console.log('Request type:', type, 'User:', session.user.email)

    await dbConnect()
    console.log('✅ Database connected')

    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      console.log('❌ User not found in database:', session.user.email)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    console.log('✅ Current user found:', {
      id: currentUser._id,
      email: currentUser.email,
      friendRequestsCount: currentUser.friendRequests?.length || 0,
      sentRequestsCount: currentUser.sentRequests?.length || 0
    })

    // Initialize arrays if they don't exist
    if (!currentUser.friendRequests) {
      currentUser.friendRequests = [];
    }
    if (!currentUser.sentRequests) {
      currentUser.sentRequests = [];
    }

    if (type === 'received') {
      console.log('Processing received requests...')
      console.log('Raw friendRequests:', currentUser.friendRequests)
      
      // Get received requests from current user's friendRequests array
      const receivedRequests = currentUser.friendRequests
        .filter((req: any) => {
          console.log('Filtering request:', { status: req.status, from: req.from })
          return req.status === 'pending'
        })
        .map((req: any) => {
          console.log('Mapping request:', req)
          // Use existing ID or create a consistent one
          const requestId = req._id?.toString() || new mongoose.Types.ObjectId().toString();
          
          return {
            id: requestId,
            from: {
              id: req.from?.toString() || '',
              username: req.fromName || 'Unknown',
              email: '',
              profilePicture: req.fromAvatar || null,
            },
            status: req.status,
            createdAt: req.createdAt || new Date(),
            updatedAt: req.updatedAt || new Date(),
          };
        });
      
      console.log('Processed receivedRequests:', receivedRequests)

      // Populate sender details
      console.log('Populating sender details...')
      const populatedRequests = await Promise.all(
        receivedRequests.map(async (request) => {
          try {
            if (!request.from.id) {
              console.log('❌ No sender ID found for request:', request.id)
              return request;
            }
            
            console.log('Looking up sender:', request.from.id)
            const sender = await User.findById(request.from.id).select('username email profilePicture');
            if (sender) {
              console.log('Found sender:', sender.username)
              request.from = {
                id: (sender._id as mongoose.Types.ObjectId).toString(),
                username: sender.username,
                email: sender.email,
                profilePicture: sender.profilePicture,
              };
            } else {
              console.log('❌ Sender not found for ID:', request.from.id)
            }
          } catch (error) {
            console.error('Error populating sender:', error);
          }
          return request;
        })
      );

      console.log('Final populated requests:', populatedRequests)
      console.log('=== FRIEND REQUEST GET END (received) ===')
      
      return NextResponse.json({
        requests: populatedRequests,
        count: populatedRequests.length,
        type
      })
    } else if (type === 'sent') {
      console.log('Processing sent requests...')
      console.log('Raw sentRequests:', currentUser.sentRequests)
      
      // Get sent requests from current user's sentRequests array
      const sentRequests = currentUser.sentRequests
        .filter((req: any) => {
          console.log('Filtering sent request:', { status: req.status, to: req.to })
          return req.status === 'pending'
        })
        .map((req: any) => {
          console.log('Mapping sent request:', req)
          // Use existing ID or create a consistent one
          const requestId = req._id?.toString() || new mongoose.Types.ObjectId().toString();
          
          return {
            id: requestId,
            to: {
              id: req.to?.toString() || '',
              username: req.toName || 'Unknown',
              email: '',
              profilePicture: req.toAvatar || null,
            },
            status: req.status,
            createdAt: req.createdAt || new Date(),
            updatedAt: req.updatedAt || new Date(),
          };
        });
      
      console.log('Processed sentRequests:', sentRequests)

      // Populate recipient details
      console.log('Populating recipient details...')
      const populatedRequests = await Promise.all(
        sentRequests.map(async (request) => {
          try {
            if (!request.to.id) {
              console.log('❌ No recipient ID found for request:', request.id)
              return request;
            }
            
            console.log('Looking up recipient:', request.to.id)
            const recipient = await User.findById(request.to.id).select('username email profilePicture');
            if (recipient) {
              console.log('Found recipient:', recipient.username)
              request.to = {
                id: (recipient._id as mongoose.Types.ObjectId).toString(),
                username: recipient.username,
                email: recipient.email,
                profilePicture: recipient.profilePicture,
              };
            } else {
              console.log('❌ Recipient not found for ID:', request.to.id)
            }
          } catch (error) {
            console.error('Error populating recipient:', error);
          }
          return request;
        })
      );

      console.log('Final populated sent requests:', populatedRequests)
      console.log('=== FRIEND REQUEST GET END (sent) ===')

      return NextResponse.json({
        requests: populatedRequests,
        count: populatedRequests.length,
        type
      })
    } else {
      return NextResponse.json(
        { error: 'Invalid type parameter. Must be "received" or "sent"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('=== FRIEND REQUEST GET ERROR ===')
    console.error('Error type:', error?.constructor?.name)
    console.error('Error message:', error instanceof Error ? error.message : error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('=== END ERROR LOG ===')
    
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
