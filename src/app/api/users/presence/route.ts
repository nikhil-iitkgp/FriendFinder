import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import dbConnect from '@/lib/mongoose'
import User from '@/models/User'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, lastSeen } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    await dbConnect()

    const user = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          status,
          lastSeen: lastSeen ? new Date(lastSeen) : new Date(),
          updatedAt: new Date()
        }
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        status: user.status,
        lastSeen: user.lastSeen
      }
    })

  } catch (error) {
    console.error('HTTP presence update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userIds = searchParams.get('userIds')?.split(',') || []

    await dbConnect()

    const query = userIds.length > 0 
      ? { _id: { $in: userIds } }
      : {}

    const users = await User.find(query)
      .select('_id name status lastSeen')
      .lean()

    const presenceData = users.map(user => ({
      id: user._id,
      name: user.name,
      status: user.status,
      lastSeen: user.lastSeen,
      isOnline: user.status === 'online' && 
        user.lastSeen && 
        Date.now() - new Date(user.lastSeen).getTime() < 5 * 60 * 1000 // 5 minutes
    }))

    return NextResponse.json({
      success: true,
      presence: presenceData
    })

  } catch (error) {
    console.error('HTTP presence fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}