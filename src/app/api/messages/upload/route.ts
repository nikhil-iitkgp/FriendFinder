import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'
import Message from '@/models/Message'
import mongoose from 'mongoose'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const friendId = formData.get('friendId') as string

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!friendId || !mongoose.Types.ObjectId.isValid(friendId)) {
      return NextResponse.json(
        { error: 'Valid friend ID is required' },
        { status: 400 }
      )
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size cannot exceed 10MB' },
        { status: 400 }
      )
    }

    await dbConnect()

    // Get current user
    const currentUser = await User.findOne({ email: session.user.email })
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Verify friendship
    if (!currentUser.isFriendWith(friendId as any)) {
      return NextResponse.json(
        { error: 'Can only send files to friends' },
        { status: 403 }
      )
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'messages')
    try {
      await mkdir(uploadsDir, { recursive: true })
    } catch (error) {
      // Directory might already exist
    }

    // Generate unique filename
    const timestamp = Date.now()
    const fileExtension = path.extname(file.name)
    const fileName = `${timestamp}-${Math.random().toString(36).substring(2)}${fileExtension}`
    const filePath = path.join(uploadsDir, fileName)
    const fileUrl = `/uploads/messages/${fileName}`

    // Save file to disk
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Determine message type
    const isImage = file.type.startsWith('image/')
    const messageType = isImage ? 'image' : 'file'

    // Create chat ID
    const chatId = Message.createChatId((currentUser._id as any).toString(), friendId)

    // Create message
    const message = new Message({
      chatId,
      senderId: currentUser._id,
      receiverId: friendId,
      content: isImage ? '' : `Shared ${file.name}`,
      type: messageType,
      status: 'sent',
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
    })

    await message.save()

    // Populate sender info
    await message.populate('senderId', 'username profilePicture')

    const messageData = {
      _id: message._id,
      chatId: message.chatId,
      senderId: {
        _id: message.senderId._id,
        username: (message.senderId as any).username,
        profilePicture: (message.senderId as any).profilePicture,
      },
      receiverId: message.receiverId,
      content: message.content,
      type: message.type,
      status: message.status,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileSize: message.fileSize,
    }

    return NextResponse.json({
      message: messageData,
      success: true,
    })

  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
