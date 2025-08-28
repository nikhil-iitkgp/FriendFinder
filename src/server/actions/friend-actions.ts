'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import { Types } from 'mongoose'
import { revalidatePath } from 'next/cache'

export interface FriendRequestResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(targetUserId: string): Promise<FriendRequestResult> {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Authentication required'
      }
    }

    // Validate target user ID
    if (!Types.ObjectId.isValid(targetUserId)) {
      return {
        success: false,
        message: 'Invalid user ID'
      }
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return {
        success: false,
        message: 'Current user not found'
      }
    }

    // Get target user
    const targetUser = await User.findById(targetUserId)
    if (!targetUser) {
      return {
        success: false,
        message: 'Target user not found'
      }
    }

    // Check if trying to send request to self
    if (currentUser._id.toString() === targetUserId) {
      return {
        success: false,
        message: 'Cannot send friend request to yourself'
      }
    }

    // Check if already friends
    if (currentUser.friends.includes(targetUserId)) {
      return {
        success: false,
        message: 'You are already friends with this user'
      }
    }

    // Check if friend request already sent
    const existingRequest = targetUser.friendRequests.find(
      req => req.from.toString() === currentUser._id.toString() && req.status === 'pending'
    )
    if (existingRequest) {
      return {
        success: false,
        message: 'Friend request already sent'
      }
    }

    // Check if target user already sent a request to current user
    const reverseRequest = currentUser.friendRequests.find(
      req => req.from.toString() === targetUserId && req.status === 'pending'
    )
    if (reverseRequest) {
      return {
        success: false,
        message: 'This user has already sent you a friend request. Check your pending requests.'
      }
    }

    // Create friend request
    const friendRequest = {
      from: currentUser._id,
      fromName: currentUser.username || currentUser.email,
      fromAvatar: currentUser.profilePicture || null,
      status: 'pending',
      createdAt: new Date()
    }

    // Add friend request to target user
    await User.findByIdAndUpdate(
      targetUserId,
      {
        $push: { friendRequests: friendRequest }
      },
      { new: true }
    )

    // Add sent request to current user's sentRequests (optional tracking)
    await User.findByIdAndUpdate(
      currentUser._id,
      {
        $push: {
          sentRequests: {
            to: targetUserId,
            toName: targetUser.username || targetUser.email,
            status: 'pending',
            createdAt: new Date()
          }
        }
      },
      { new: true }
    )

    // Send real-time notification via Socket.IO API
    try {
      await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/api/socket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'friend_request',
          data: {
            targetUserId,
            fromUserId: currentUser._id.toString(),
            fromUserName: friendRequest.fromName,
            fromUserAvatar: friendRequest.fromAvatar
          }
        })
      })
    } catch (socketError) {
      console.error('Failed to send real-time notification:', socketError)
      // Continue without failing the friend request
    }

    // Revalidate relevant pages
    revalidatePath('/dashboard/friends')
    revalidatePath('/dashboard/discover')

    return {
      success: true,
      message: 'Friend request sent successfully',
      data: {
        targetUser: {
          id: targetUser._id,
          name: targetUser.username || targetUser.email,
          avatar: targetUser.profilePicture
        }
      }
    }

  } catch (error) {
    console.error('Error sending friend request:', error)
    return {
      success: false,
      message: 'Failed to send friend request. Please try again.'
    }
  }
}

/**
 * Respond to a friend request (accept or reject)
 */
export async function respondToFriendRequest(
  requestId: string, 
  action: 'accept' | 'reject'
): Promise<FriendRequestResult> {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Authentication required'
      }
    }

    // Validate request ID
    if (!Types.ObjectId.isValid(requestId)) {
      return {
        success: false,
        message: 'Invalid request ID'
      }
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return {
        success: false,
        message: 'Current user not found'
      }
    }

    // Find the friend request
    const friendRequest = currentUser.friendRequests.find(
      req => req._id?.toString() === requestId && req.status === 'pending'
    )

    if (!friendRequest) {
      return {
        success: false,
        message: 'Friend request not found or already processed'
      }
    }

    const senderId = friendRequest.from

    if (action === 'accept') {
      // Add each user to the other's friends list
      await User.findByIdAndUpdate(
        currentUser._id,
        {
          $addToSet: { friends: senderId },
          $pull: { friendRequests: { _id: requestId } }
        }
      )

      await User.findByIdAndUpdate(
        senderId,
        {
          $addToSet: { friends: currentUser._id },
          $pull: { sentRequests: { to: currentUser._id } }
        }
      )

      // Revalidate relevant pages
      revalidatePath('/dashboard/friends')
      revalidatePath('/dashboard/discover')

      // Send real-time notification for friend request acceptance
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/api/socket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'friend_response',
            data: {
              requesterId: senderId.toString(),
              responderName: currentUser.username || currentUser.email,
              action: 'accepted'
            }
          })
        })
      } catch (socketError) {
        console.error('Failed to send real-time notification:', socketError)
        // Continue without failing the response
      }

      return {
        success: true,
        message: 'Friend request accepted! You are now friends.',
        data: {
          action: 'accepted',
          friend: {
            id: senderId,
            name: friendRequest.fromName,
            avatar: friendRequest.fromAvatar
          }
        }
      }

    } else if (action === 'reject') {
      // Remove the friend request
      await User.findByIdAndUpdate(
        currentUser._id,
        {
          $pull: { friendRequests: { _id: requestId } }
        }
      )

      // Update sender's sent requests
      await User.findByIdAndUpdate(
        senderId,
        {
          $pull: { sentRequests: { to: currentUser._id } }
        }
      )

      // Revalidate relevant pages
      revalidatePath('/dashboard/friends')
      revalidatePath('/dashboard/discover')

      // Send real-time notification for friend request rejection
      try {
        await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3003'}/api/socket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'friend_response',
            data: {
              requesterId: senderId.toString(),
              responderName: currentUser.username || currentUser.email,
              action: 'rejected'
            }
          })
        })
      } catch (socketError) {
        console.error('Failed to send real-time notification:', socketError)
        // Continue without failing the response
      }

      return {
        success: true,
        message: 'Friend request rejected.',
        data: {
          action: 'rejected',
          requestId
        }
      }
    }

    return {
      success: false,
      message: 'Invalid action specified'
    }

  } catch (error) {
    console.error('Error responding to friend request:', error)
    return {
      success: false,
      message: 'Failed to process friend request. Please try again.'
    }
  }
}

/**
 * Get pending friend requests for the current user
 */
export async function getPendingFriendRequests(): Promise<FriendRequestResult> {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Authentication required'
      }
    }

    await dbConnect()

    // Get current user with pending friend requests
    const currentUser = await User.findOne({ email: session.user.email })
      .select('friendRequests')
      .lean()

    if (!currentUser) {
      return {
        success: false,
        message: 'User not found'
      }
    }

    // Filter for pending requests and format the data
    const pendingRequests = currentUser.friendRequests
      .filter(req => req.status === 'pending')
      .map(req => ({
        id: req._id?.toString(),
        from: req.from,
        fromName: req.fromName,
        fromAvatar: req.fromAvatar,
        createdAt: req.createdAt,
        status: req.status
      }))

    return {
      success: true,
      message: 'Pending friend requests retrieved successfully',
      data: {
        requests: pendingRequests,
        count: pendingRequests.length
      }
    }

  } catch (error) {
    console.error('Error getting pending friend requests:', error)
    return {
      success: false,
      message: 'Failed to retrieve friend requests'
    }
  }
}

/**
 * Cancel a sent friend request
 */
export async function cancelFriendRequest(targetUserId: string): Promise<FriendRequestResult> {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Authentication required'
      }
    }

    // Validate target user ID
    if (!Types.ObjectId.isValid(targetUserId)) {
      return {
        success: false,
        message: 'Invalid user ID'
      }
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return {
        success: false,
        message: 'Current user not found'
      }
    }

    // Remove friend request from target user
    await User.findByIdAndUpdate(
      targetUserId,
      {
        $pull: { 
          friendRequests: { 
            from: currentUser._id,
            status: 'pending'
          } 
        }
      }
    )

    // Remove sent request from current user
    await User.findByIdAndUpdate(
      currentUser._id,
      {
        $pull: { 
          sentRequests: { 
            to: targetUserId,
            status: 'pending'
          } 
        }
      }
    )

    // Revalidate relevant pages
    revalidatePath('/dashboard/friends')
    revalidatePath('/dashboard/discover')

    return {
      success: true,
      message: 'Friend request cancelled successfully'
    }

  } catch (error) {
    console.error('Error cancelling friend request:', error)
    return {
      success: false,
      message: 'Failed to cancel friend request. Please try again.'
    }
  }
}

/**
 * Remove a friend (unfriend)
 */
export async function removeFriend(friendId: string): Promise<FriendRequestResult> {
  try {
    // Get current user session
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return {
        success: false,
        message: 'Authentication required'
      }
    }

    // Validate friend ID
    if (!Types.ObjectId.isValid(friendId)) {
      return {
        success: false,
        message: 'Invalid user ID'
      }
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return {
        success: false,
        message: 'Current user not found'
      }
    }

    // Check if they are actually friends
    if (!currentUser.friends.includes(friendId)) {
      return {
        success: false,
        message: 'You are not friends with this user'
      }
    }

    // Remove from both users' friends lists
    await User.findByIdAndUpdate(
      currentUser._id,
      {
        $pull: { friends: friendId }
      }
    )

    await User.findByIdAndUpdate(
      friendId,
      {
        $pull: { friends: currentUser._id }
      }
    )

    // Revalidate relevant pages
    revalidatePath('/dashboard/friends')
    revalidatePath('/dashboard/discover')

    return {
      success: true,
      message: 'Friend removed successfully'
    }

  } catch (error) {
    console.error('Error removing friend:', error)
    return {
      success: false,
      message: 'Failed to remove friend. Please try again.'
    }
  }
}
