import { moderateContent, getRateLimitStatus, cleanupRateLimitData } from '@/lib/content-moderation';

describe('Content Moderation', () => {
  beforeEach(() => {
    // Clean up rate limit data before each test
    cleanupRateLimitData(0);
  });

  describe('moderateContent', () => {
    test('should allow normal content', () => {
      const result = moderateContent('Hello, how are you?', 'user123');
      
      expect(result.isAllowed).toBe(true);
      expect(result.severity).toBe('low');
      expect(result.filteredContent).toBe('Hello, how are you?');
    });

    test('should reject empty content', () => {
      const result = moderateContent('', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message cannot be empty.');
      expect(result.severity).toBe('low');
    });

    test('should reject whitespace-only content', () => {
      const result = moderateContent('   \n\t   ', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message cannot be empty.');
      expect(result.severity).toBe('low');
    });

    test('should reject content that is too long', () => {
      const longContent = 'a'.repeat(1001);
      const result = moderateContent(longContent, 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message too long. Maximum 1000 characters allowed.');
      expect(result.severity).toBe('low');
    });

    test('should reject content with inappropriate words', () => {
      const result = moderateContent('This is spam content', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message contains inappropriate content.');
      expect(result.severity).toBe('high');
    });

    test('should reject content with phone numbers', () => {
      const result = moderateContent('Call me at 123-456-7890', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message contains suspicious content (URLs, phone numbers, etc.).');
      expect(result.severity).toBe('medium');
    });

    test('should reject content with email addresses', () => {
      const result = moderateContent('Email me at test@example.com', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message contains suspicious content (URLs, phone numbers, etc.).');
      expect(result.severity).toBe('medium');
    });

    test('should reject content with URLs', () => {
      const result = moderateContent('Visit https://example.com', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message contains suspicious content (URLs, phone numbers, etc.).');
      expect(result.severity).toBe('medium');
    });

    test('should reject content with excessive capitals', () => {
      const result = moderateContent('THIS IS ALL CAPS MESSAGE', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Please avoid excessive capital letters.');
      expect(result.severity).toBe('low');
    });

    test('should allow content with some capitals', () => {
      const result = moderateContent('Hello WORLD! How are you?', 'user123');
      
      expect(result.isAllowed).toBe(true);
      expect(result.severity).toBe('low');
    });

    test('should reject repeated characters (spam)', () => {
      const result = moderateContent('Hellooooooo', 'user123');
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message contains suspicious content (URLs, phone numbers, etc.).');
      expect(result.severity).toBe('medium');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow messages within rate limit', () => {
      for (let i = 0; i < 10; i++) {
        const result = moderateContent(`Message ${i}`, 'user123');
        expect(result.isAllowed).toBe(true);
      }
    });

    test('should reject messages exceeding rate limit', () => {
      // Send 10 messages (at limit)
      for (let i = 0; i < 10; i++) {
        moderateContent(`Message ${i}`, 'user123');
      }

      // 11th message should be rejected
      const result = moderateContent('Message 11', 'user123');
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Rate limit exceeded. Please slow down.');
      expect(result.severity).toBe('medium');
    });

    test('should allow bypassing rate limit check', () => {
      // Send 10 messages (at limit)
      for (let i = 0; i < 10; i++) {
        moderateContent(`Message ${i}`, 'user123');
      }

      // 11th message should be allowed with rate limit disabled
      const result = moderateContent('Message 11', 'user123', { checkRateLimit: false });
      expect(result.isAllowed).toBe(true);
    });

    test('should have separate rate limits per user', () => {
      // Send 10 messages for user1 (at limit)
      for (let i = 0; i < 10; i++) {
        moderateContent(`Message ${i}`, 'user1');
      }

      // user1 should be rate limited
      const result1 = moderateContent('Message 11', 'user1');
      expect(result1.isAllowed).toBe(false);

      // user2 should not be rate limited
      const result2 = moderateContent('Message 1', 'user2');
      expect(result2.isAllowed).toBe(true);
    });
  });

  describe('getRateLimitStatus', () => {
    test('should return correct rate limit status for new user', () => {
      const status = getRateLimitStatus('newuser');
      
      expect(status.count).toBe(0);
      expect(status.remaining).toBe(10);
      expect(status.resetTime).toBeGreaterThan(Date.now());
    });

    test('should return correct rate limit status after messages', () => {
      // Send 3 messages
      for (let i = 0; i < 3; i++) {
        moderateContent(`Message ${i}`, 'user123');
      }

      const status = getRateLimitStatus('user123');
      
      expect(status.count).toBe(3);
      expect(status.remaining).toBe(7);
    });

    test('should return zero remaining when at limit', () => {
      // Send 10 messages (at limit)
      for (let i = 0; i < 10; i++) {
        moderateContent(`Message ${i}`, 'user123');
      }

      const status = getRateLimitStatus('user123');
      
      expect(status.count).toBe(10);
      expect(status.remaining).toBe(0);
    });
  });

  describe('Custom Options', () => {
    test('should respect custom max length', () => {
      const result = moderateContent('This is a long message', 'user123', { maxLength: 10 });
      
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Message too long. Maximum 10 characters allowed.');
    });

    test('should respect custom rate limit settings', () => {
      // Send 5 messages with custom limit of 5
      for (let i = 0; i < 5; i++) {
        moderateContent(`Message ${i}`, 'user123', { maxMessages: 5 });
      }

      // 6th message should be rejected
      const result = moderateContent('Message 6', 'user123', { maxMessages: 5 });
      expect(result.isAllowed).toBe(false);
      expect(result.reason).toBe('Rate limit exceeded. Please slow down.');
    });
  });
});

describe('Edge Cases', () => {
  test('should handle special characters correctly', () => {
    const result = moderateContent('Hello! 👋 How are you? 😊', 'user123');
    
    expect(result.isAllowed).toBe(true);
    expect(result.filteredContent).toBe('Hello! 👋 How are you? 😊');
  });

  test('should handle multilingual content', () => {
    const result = moderateContent('Hola, ¿cómo estás? 你好吗？', 'user123');
    
    expect(result.isAllowed).toBe(true);
  });

  test('should trim whitespace from content', () => {
    const result = moderateContent('  Hello world  ', 'user123');
    
    expect(result.isAllowed).toBe(true);
    expect(result.filteredContent).toBe('Hello world');
  });
});