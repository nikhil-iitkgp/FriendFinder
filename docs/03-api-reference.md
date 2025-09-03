# API Reference

## Overview

FriendFinder provides a comprehensive RESTful API built with Next.js API routes. All endpoints follow REST conventions and return JSON responses with consistent error handling.

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.com/api`

## Authentication

Most endpoints require authentication using NextAuth.js sessions. Include the session cookie in requests.

### Headers

```
Content-Type: application/json
Cookie: next-auth.session-token=<session-token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Optional error details
  }
}
```

## Authentication Endpoints

### POST /api/auth/signin

Sign in a user with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "username": "username"
    },
    "session": {
      "token": "jwt_token",
      "expires": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

### POST /api/auth/signup

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "confirmPassword": "password123"
}
```

### POST /api/auth/signout

Sign out the current user.

## User Management

### GET /api/users/profile

Get current user's profile information.

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "username": "username",
    "avatar": "avatar_url",
    "bio": "User bio",
    "location": {
      "city": "City",
      "country": "Country"
    },
    "privacy": {
      "showLocation": true,
      "allowFriendRequests": true
    }
  }
}
```

### PUT /api/users/profile

Update user profile information.

**Request Body:**

```json
{
  "username": "new_username",
  "bio": "Updated bio",
  "avatar": "new_avatar_url"
}
```

### GET /api/users/search

Search for users by username or email.

**Query Parameters:**

- `q`: Search query string
- `limit`: Number of results (default: 10)
- `offset`: Pagination offset (default: 0)

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "username": "username",
        "avatar": "avatar_url",
        "isFriend": false,
        "hasPendingRequest": false
      }
    ],
    "total": 25,
    "hasMore": true
  }
}
```

## Friend Management

### GET /api/friends

Get user's friends list.

**Query Parameters:**

- `status`: Filter by status (all, online, offline)
- `limit`: Number of results
- `offset`: Pagination offset

**Response:**

```json
{
  "success": true,
  "data": {
    "friends": [
      {
        "id": "friend_id",
        "username": "friend_username",
        "avatar": "avatar_url",
        "status": "online",
        "lastSeen": "2024-01-01T00:00:00.000Z"
      }
    ],
    "total": 15
  }
}
```

### POST /api/friends/request

Send a friend request.

**Request Body:**

```json
{
  "recipientId": "user_id",
  "message": "Optional message"
}
```

### PUT /api/friends/request/[requestId]

Respond to a friend request.

**Request Body:**

```json
{
  "action": "accept" | "decline"
}
```

### DELETE /api/friends/[friendId]

Remove a friend.

**Response:**

```json
{
  "success": true,
  "message": "Friend removed successfully"
}
```

## Messaging

### GET /api/conversations

Get user's conversations list.

**Response:**

```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "conversation_id",
        "type": "direct",
        "participants": [
          {
            "id": "user_id",
            "username": "username",
            "avatar": "avatar_url"
          }
        ],
        "lastMessage": {
          "id": "message_id",
          "content": "Last message content",
          "senderId": "sender_id",
          "timestamp": "2024-01-01T00:00:00.000Z"
        },
        "unreadCount": 3
      }
    ]
  }
}
```

### GET /api/conversations/[conversationId]/messages

Get messages for a conversation.

**Query Parameters:**

- `limit`: Number of messages (default: 50)
- `before`: Get messages before this timestamp
- `after`: Get messages after this timestamp

**Response:**

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "message_id",
        "content": "Message content",
        "senderId": "sender_id",
        "conversationId": "conversation_id",
        "timestamp": "2024-01-01T00:00:00.000Z",
        "type": "text",
        "edited": false,
        "readBy": ["user_id_1", "user_id_2"]
      }
    ],
    "hasMore": true
  }
}
```

### POST /api/messages

Send a new message.

**Request Body:**

```json
{
  "conversationId": "conversation_id",
  "content": "Message content",
  "type": "text" | "image" | "file",
  "replyTo": "optional_message_id"
}
```

### PUT /api/messages/[messageId]

Edit a message.

**Request Body:**

```json
{
  "content": "Updated message content"
}
```

### DELETE /api/messages/[messageId]

Delete a message.

## Random Chat

### POST /api/random-chat/queue

Join the random chat queue.

**Request Body:**

```json
{
  "chatType": "text" | "voice" | "video",
  "preferences": {
    "language": "en",
    "interests": ["gaming", "music"],
    "ageRange": {
      "min": 18,
      "max": 30
    }
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "type": "queued" | "match_found",
    "queueId": "queue_id",
    "anonymousId": "anonymous_name",
    "position": 3,
    "estimatedWaitTime": 45
  }
}
```

### DELETE /api/random-chat/queue

Leave the random chat queue.

### GET /api/random-chat/session

Get current random chat session.

**Response:**

```json
{
  "success": true,
  "data": {
    "sessionId": "session_id",
    "partner": {
      "anonymousId": "partner_name"
    },
    "chatType": "text",
    "status": "active",
    "messages": []
  }
}
```

## Location Services

### POST /api/users/location

Update user's location.

**Request Body:**

```json
{
  "latitude": 40.7128,
  "longitude": -74.006,
  "accuracy": 10
}
```

### GET /api/users/nearby

Get nearby users.

**Query Parameters:**

- `radius`: Search radius in kilometers (default: 5)
- `limit`: Number of results (default: 20)

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_id",
        "username": "username",
        "avatar": "avatar_url",
        "distance": 2.5,
        "commonInterests": ["gaming", "music"]
      }
    ]
  }
}
```

## WebRTC Signaling

### POST /api/calls/initiate

Initiate a voice or video call.

**Request Body:**

```json
{
  "recipientId": "user_id",
  "type": "voice" | "video"
}
```

### GET /api/calls/[callId]/signal

Get signaling data for WebRTC connection.

## Error Codes

| Code               | Description            |
| ------------------ | ---------------------- |
| `UNAUTHORIZED`     | User not authenticated |
| `FORBIDDEN`        | User lacks permission  |
| `NOT_FOUND`        | Resource not found     |
| `VALIDATION_ERROR` | Invalid input data     |
| `RATE_LIMITED`     | Too many requests      |
| `SERVER_ERROR`     | Internal server error  |

## Rate Limiting

- Authentication endpoints: 5 requests per minute
- Messaging endpoints: 60 requests per minute
- Search endpoints: 30 requests per minute
- General endpoints: 100 requests per minute

## WebSocket Events

### Socket.IO Events

**Client to Server:**

- `join-room`: Join a conversation room
- `send-message`: Send a real-time message
- `typing-start`: Indicate typing started
- `typing-stop`: Indicate typing stopped

**Server to Client:**

- `message-received`: New message received
- `user-typing`: User started typing
- `user-stopped-typing`: User stopped typing
- `user-online`: Friend came online
- `user-offline`: Friend went offline

---

_This API reference covers all major endpoints and functionality. For the most up-to-date information, refer to the OpenAPI documentation or source code._
