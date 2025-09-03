/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import WebRTCInterface from '@/components/random-chat/WebRTCInterface';
import { RandomChatProvider } from '@/context/RandomChatContext';
import type { RandomChatSession } from '@/context/RandomChatContext';

// Mock getUserMedia
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: mockGetUserMedia,
  },
});

// Mock RTCPeerConnection
global.RTCPeerConnection = jest.fn().mockImplementation(() => ({
  createOffer: jest.fn().mockResolvedValue({}),
  createAnswer: jest.fn().mockResolvedValue({}),
  setLocalDescription: jest.fn(),
  setRemoteDescription: jest.fn(),
  addIceCandidate: jest.fn(),
  addTrack: jest.fn(),
  close: jest.fn(),
  ontrack: null,
  onicecandidate: null,
  onconnectionstatechange: null,
  connectionState: 'new',
}));

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

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock session data
const mockVideoSession: RandomChatSession = {
  sessionId: 'test-session-video',
  partner: {
    anonymousId: 'TestPartner123',
    username: 'TestPartner123',
    isActive: true,
  },
  userAnonymousId: 'TestUser456',
  status: 'active',
  chatType: 'video',
  startTime: new Date(),
  messagesCount: 0,
  messages: [],
};

const mockVoiceSession: RandomChatSession = {
  ...mockVideoSession,
  sessionId: 'test-session-voice',
  chatType: 'voice',
};

function renderWithProvider(session: RandomChatSession, onEndCall: () => void = jest.fn()) {
  return render(
    <RandomChatProvider>
      <WebRTCInterface session={session} onEndCall={onEndCall} />
    </RandomChatProvider>
  );
}

describe('WebRTCInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockClear();
  });

  test('should render video call interface', async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [
        { kind: 'video', enabled: true, stop: jest.fn() },
        { kind: 'audio', enabled: true, stop: jest.fn() },
      ],
      getVideoTracks: () => [{ enabled: true }],
      getAudioTracks: () => [{ enabled: true }],
    });

    renderWithProvider(mockVideoSession);

    await waitFor(() => {
      expect(screen.getByText('Video Call')).toBeInTheDocument();
    });

    expect(screen.getByText('TestPartner123')).toBeInTheDocument();
  });

  test('should render voice call interface', async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [
        { kind: 'audio', enabled: true, stop: jest.fn() },
      ],
      getVideoTracks: () => [],
      getAudioTracks: () => [{ enabled: true }],
    });

    renderWithProvider(mockVoiceSession);

    await waitFor(() => {
      expect(screen.getByText('Voice Call')).toBeInTheDocument();
    });

    expect(screen.getByText('TestPartner123')).toBeInTheDocument();
  });

  test('should show call controls', async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [
        { kind: 'video', enabled: true, stop: jest.fn() },
        { kind: 'audio', enabled: true, stop: jest.fn() },
      ],
      getVideoTracks: () => [{ enabled: true }],
      getAudioTracks: () => [{ enabled: true }],
    });

    renderWithProvider(mockVideoSession);

    await waitFor(() => {
      expect(screen.getByTitle('Mute')).toBeInTheDocument();
      expect(screen.getByTitle('Turn off camera')).toBeInTheDocument();
      expect(screen.getByTitle('End call')).toBeInTheDocument();
    });
  });

  test('should handle audio toggle', async () => {
    const mockAudioTrack = { enabled: true, stop: jest.fn() };
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [mockAudioTrack],
      getVideoTracks: () => [],
      getAudioTracks: () => [mockAudioTrack],
    });

    renderWithProvider(mockVoiceSession);

    await waitFor(() => {
      expect(screen.getByTitle('Mute')).toBeInTheDocument();
    });

    const muteButton = screen.getByTitle('Mute');
    fireEvent.click(muteButton);

    await waitFor(() => {
      expect(mockAudioTrack.enabled).toBe(false);
    });
  });

  test('should handle video toggle', async () => {
    const mockVideoTrack = { enabled: true, stop: jest.fn() };
    const mockAudioTrack = { enabled: true, stop: jest.fn() };
    
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [mockVideoTrack, mockAudioTrack],
      getVideoTracks: () => [mockVideoTrack],
      getAudioTracks: () => [mockAudioTrack],
    });

    renderWithProvider(mockVideoSession);

    await waitFor(() => {
      expect(screen.getByTitle('Turn off camera')).toBeInTheDocument();
    });

    const videoButton = screen.getByTitle('Turn off camera');
    fireEvent.click(videoButton);

    await waitFor(() => {
      expect(mockVideoTrack.enabled).toBe(false);
    });
  });

  test('should call onEndCall when end button is clicked', async () => {
    const mockOnEndCall = jest.fn();
    
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    });

    renderWithProvider(mockVideoSession, mockOnEndCall);

    await waitFor(() => {
      expect(screen.getByTitle('End call')).toBeInTheDocument();
    });

    const endButton = screen.getByTitle('End call');
    fireEvent.click(endButton);

    expect(mockOnEndCall).toHaveBeenCalled();
  });

  test('should show connection status', async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    });

    renderWithProvider(mockVideoSession);

    await waitFor(() => {
      // Should show connecting status initially
      expect(screen.getByText(/Connecting|Setting up call/)).toBeInTheDocument();
    });
  });

  test('should handle getUserMedia errors', async () => {
    mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

    renderWithProvider(mockVideoSession);

    await waitFor(() => {
      expect(screen.getByText('Call Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to access camera/microphone')).toBeInTheDocument();
    });
  });

  test('should show WebRTC not supported message when unavailable', () => {
    // Temporarily remove mediaDevices
    const originalMediaDevices = navigator.mediaDevices;
    delete (navigator as any).mediaDevices;

    renderWithProvider(mockVideoSession);

    expect(screen.getByText('WebRTC Not Supported')).toBeInTheDocument();
    expect(screen.getByText(/browser doesn't support voice\/video calls/)).toBeInTheDocument();

    // Restore mediaDevices
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      value: originalMediaDevices,
    });
  });

  test('should emit WebRTC events through socket', async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [],
      getVideoTracks: () => [],
      getAudioTracks: () => [],
    });

    renderWithProvider(mockVideoSession);

    // Wait for initialization
    await waitFor(() => {
      expect(mockGetUserMedia).toHaveBeenCalled();
    });

    // Check that socket events are registered
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:webrtc-offer-received', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:webrtc-answer-received', expect.any(Function));
    expect(mockSocket.on).toHaveBeenCalledWith('random-chat:webrtc-ice-candidate-received', expect.any(Function));
  });
});

describe('WebRTC Hook Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize peer connection for video calls', async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [
        { kind: 'video', enabled: true, stop: jest.fn() },
        { kind: 'audio', enabled: true, stop: jest.fn() },
      ],
      getVideoTracks: () => [{ enabled: true }],
      getAudioTracks: () => [{ enabled: true }],
    });

    renderWithProvider(mockVideoSession);

    await waitFor(() => {
      expect(RTCPeerConnection).toHaveBeenCalled();
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          frameRate: { ideal: 30, max: 60 }
        }
      });
    });
  });

  test('should initialize peer connection for voice calls', async () => {
    mockGetUserMedia.mockResolvedValue({
      getTracks: () => [
        { kind: 'audio', enabled: true, stop: jest.fn() },
      ],
      getVideoTracks: () => [],
      getAudioTracks: () => [{ enabled: true }],
    });

    renderWithProvider(mockVoiceSession);

    await waitFor(() => {
      expect(RTCPeerConnection).toHaveBeenCalled();
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        audio: true,
        video: false
      });
    });
  });
});