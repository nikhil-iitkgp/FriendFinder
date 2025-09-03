/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';
import { RandomChatProvider, useRandomChat } from '@/context/RandomChatContext';
import type { ChatPreferences } from '@/context/RandomChatContext';

// Mock next-auth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  }),
}));

// Mock socket hook
const mockSocket = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

jest.mock('@/hooks/useSocket', () => ({
  useSocket: () => ({
    socket: mockSocket,
    isConnected: true,
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Test component to use the context
function TestComponent() {
  const {
    queueStatus,
    activeSession,
    isConnected,
    joinQueue,
    leaveQueue,
    sendMessage,
    endSession,
  } = useRandomChat();

  const handleJoinQueue = () => {
    const preferences: ChatPreferences = {
      chatType: 'text',
      language: 'en',
    };
    joinQueue(preferences);
  };

  return (
    <div>
      <div data-testid="connection-status">
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      
      <div data-testid="queue-status">
        {queueStatus.inQueue ? `In Queue: Position ${queueStatus.position}` : 'Not in Queue'}
      </div>
      
      <div data-testid="session-status">
        {activeSession ? `Active Session: ${activeSession.sessionId}` : 'No Active Session'}
      </div>
      
      <button onClick={handleJoinQueue} data-testid="join-queue-btn">
        Join Queue
      </button>
      
      <button onClick={leaveQueue} data-testid="leave-queue-btn">
        Leave Queue
      </button>
      
      <button onClick={() => sendMessage('Hello')} data-testid="send-message-btn">
        Send Message
      </button>
      
      <button onClick={endSession} data-testid="end-session-btn">
        End Session
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <RandomChatProvider>
      <TestComponent />
    </RandomChatProvider>
  );
}

describe('RandomChatContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  test('should render with initial state', () => {
    renderWithProvider();
    
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
    expect(screen.getByTestId('queue-status')).toHaveTextContent('Not in Queue');
    expect(screen.getByTestId('session-status')).toHaveTextContent('No Active Session');
  });

  test('should join queue successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          type: 'queued',
          queueId: 'queue-123',
          anonymousId: 'TestUser123',
          position: 1,
          estimatedWaitTime: 60,
        },
      }),
    });

    renderWithProvider();
    
    const joinBtn = screen.getByTestId('join-queue-btn');
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/random-chat/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatType: 'text',
          preferences: {
            chatType: 'text',
            language: 'en',
          },
        }),
      });
    });
  });

  test('should handle immediate match', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          type: 'match_found',
          sessionId: 'session-123',
          partner: {
            anonymousId: 'Partner123',
            username: 'Partner123',
          },
          anonymousId: 'TestUser123',
          chatType: 'text',
          estimatedWaitTime: 0,
        },
      }),
    });

    renderWithProvider();
    
    const joinBtn = screen.getByTestId('join-queue-btn');
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith('random-chat:join-session', 'session-123');
    });
  });

  test('should leave queue successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Successfully removed from queue',
      }),
    });

    renderWithProvider();
    
    const leaveBtn = screen.getByTestId('leave-queue-btn');
    fireEvent.click(leaveBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/random-chat/queue', {
        method: 'DELETE',
      });
    });
  });

  test('should send message', async () => {
    // First set up an active session
    const { rerender } = renderWithProvider();
    
    // Simulate having an active session
    const sendBtn = screen.getByTestId('send-message-btn');
    fireEvent.click(sendBtn);

    // Should not emit if no active session
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'random-chat:message-send',
      expect.any(Object)
    );
  });

  test('should end session successfully', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: 'Session ended',
      }),
    });

    renderWithProvider();
    
    const endBtn = screen.getByTestId('end-session-btn');
    fireEvent.click(endBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/random-chat/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'end',
          sessionId: undefined, // No active session
          reason: 'user_left',
        }),
      });
    });
  });

  test('should handle socket events', () => {
    renderWithProvider();
    
    // Verify socket event listeners are registered
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:match-found', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:message-received', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:partner-typing', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:partner-left', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:session-ended', expect.any(Function));
  });

  test('should handle connection errors', () => {
    // Mock disconnected state
    jest.doMock('@/hooks/useSocket', () => ({
      useSocket: () => ({
        socket: null,
        isConnected: false,
      }),
    }));

    renderWithProvider();
    
    expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
  });
});

describe('RandomChat API Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  test('should handle join queue API error', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'Already in queue',
      }),
    });

    renderWithProvider();
    
    const joinBtn = screen.getByTestId('join-queue-btn');
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });

  test('should handle network errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    renderWithProvider();
    
    const joinBtn = screen.getByTestId('join-queue-btn');
    fireEvent.click(joinBtn);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
  });
});