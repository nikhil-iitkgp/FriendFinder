'use client'

export function useSocket() {
  return {
    socket: null,
    isConnected: false,
    connectionError: null,
    sendFriendRequestNotification: () => {},
    sendFriendResponseNotification: () => {},
    sendMessage: () => {},
    startTyping: () => {},
    stopTyping: () => {},
    onFriendRequestReceived: () => {},
    onFriendRequestResponse: () => {},
    onMessageReceived: () => {},
    onUserStatusChanged: () => {},
    onUserTyping: () => {},
    onUserStoppedTyping: () => {},
    removeAllListeners: () => {}
  }
}
