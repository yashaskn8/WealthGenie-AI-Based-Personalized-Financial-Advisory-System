import { jest } from '@jest/globals';
import { chatMessageSchema } from '../validation/schemas.js';
import { processChat } from '../services/geminiChatService.js';
import ConversationHistory from '../models/ConversationHistory.js';
import FinancialProfile from '../models/FinancialProfile.js';
import Goal from '../models/Goal.js';
import User from '../models/User.js';
import Recommendation from '../models/Recommendation.js';
import axios from 'axios';

describe('Genie Chat Pipeline & Fallbacks', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'mock-gemini-key';
    process.env.GROQ_API_KEY = 'mock-groq-key';
    // Directly mock methods on the imported ES modules to avoid require-based jest.mock ESM issues
    ConversationHistory.findOne = jest.fn();
    FinancialProfile.findOne = jest.fn();
    Goal.find = jest.fn();
    User.findById = jest.fn();
    Recommendation.findOne = jest.fn();
    axios.post = jest.fn();
  });
  const mockUser = { id: 'user123', name: 'Pranav', email: 'pranav@wealthgenie.com' };
  const mockProfile = {
    _id: 'profile123',
    age: 32,
    income: 65000,
    annualIncome: 780000,
    savings: 12000,
    taxRegime: 'new',
    riskCategory: 'Moderate',
    recommendedEquityAllocation: 60,
    investmentHorizon: 15,
  };
  const mockGoals = [
    { goal_name: 'Retirement', target_amount: 50000000, target_date: '2045-12-31' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── 1. INPUT VALIDATION SCHEMAS ──
  describe('Input Joi Schema Validation', () => {
    test('valid message and session ID should pass', () => {
      const payload = { message: 'How to rebalance my portfolio?', session_id: 'session-xyz' };
      const { error } = chatMessageSchema.validate(payload);
      expect(error).toBeUndefined();
    });

    test('empty or whitespace message should fail', () => {
      const payload = { message: '   ' };
      const { error } = chatMessageSchema.validate(payload);
      expect(error).toBeDefined();
    });

    test('message exceeding 1000 characters should fail', () => {
      const payload = { message: 'a'.repeat(1001) };
      const { error } = chatMessageSchema.validate(payload);
      expect(error).toBeDefined();
    });
  });

  // ── 2. PROFILE GROUNDING & BOUNDARIES ──
  describe('Profile Grounding Boundaries', () => {
    test('should return profile setup alert if profile does not exist', async () => {
      FinancialProfile.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const res = await processChat({
        userId: 'user123',
        user: mockUser,
        message: 'Hello',
        sessionId: 'session-123',
      });

      expect(res.grounded).toBe(false);
      expect(res.response).toContain('complete the profile setup');
    });
  });

  // ── 3. AI SERVICE FALLBACKS & RESPONSE CONTRACTS ──
  describe('AI Service Fallbacks & Contracts', () => {
    test('should fall back to local rule-based engine if both Gemini and Groq fail', async () => {
      FinancialProfile.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProfile),
        }),
      });
      Recommendation.findOne = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      Goal.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockGoals),
        }),
      });
      User.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      // Stub save implementation for history
      const mockSave = jest.fn().mockResolvedValue(true);
      ConversationHistory.findOne.mockResolvedValue({
        messages: [],
        save: mockSave,
      });

      // Mock both axios calls to fail
      axios.post.mockRejectedValue(new Error('Network failure'));

      const res = await processChat({
        userId: 'user123',
        user: mockUser,
        message: 'rebalance portfolio',
        sessionId: 'session-123',
      });

      expect(res.response).toContain('connectivity issues');
      expect(res.response).toContain('Rebalancing Guidance');
      expect(res.response).toContain('<<<ACTION_CARD>>>');
      expect(mockSave).toHaveBeenCalled();
    });

    test('should successfully use Gemini if call is successful', async () => {
      FinancialProfile.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockProfile),
        }),
      });
      Goal.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockGoals),
        }),
      });
      User.findById.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockUser),
      });

      const mockSave = jest.fn().mockResolvedValue(true);
      ConversationHistory.findOne.mockResolvedValue({
        messages: [],
        save: mockSave,
      });

      // Mock successful Gemini response
      axios.post.mockResolvedValue({
        data: {
          candidates: [
            {
              content: { parts: [{ text: 'Here is your personalized portfolio plan.' }] },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: { totalTokenCount: 150 },
        },
      });

      const res = await processChat({
        userId: 'user123',
        user: mockUser,
        message: 'suggest plan',
        sessionId: 'session-123',
      });

      expect(res.response).toBe('Here is your personalized portfolio plan.');
      expect(res.grounded).toBe(true);
      expect(mockSave).toHaveBeenCalled();
    });
  });
});

// Mock recommendation database imports mapped at top of file
