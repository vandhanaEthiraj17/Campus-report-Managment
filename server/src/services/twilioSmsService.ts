import twilio from 'twilio';
import { maskPhoneNumber } from './emergencyNotificationService';

export interface ISmsDispatchResult {
  success: boolean;
  messageId: string;
  status:
    | 'QUEUED'
    | 'SENT'
    | 'DELIVERED'
    | 'UNDELIVERED'
    | 'FAILED'
    | 'SIMULATED_DEV'
    | 'UNAVAILABLE_NO_GATEWAY';
  recipientMasked: string;
  carrierMessageId?: string;
  error?: string;
  notes?: string;
  timestamp: Date;
}

export interface ISmsProvider {
  sendSms(to: string, message: string, eventId?: string): Promise<ISmsDispatchResult>;
  validateWebhookSignature(signature: string, url: string, params: Record<string, any>): boolean;
}

/**
 * Normalizes telephone numbers into strict E.164 format (+[country_code][number])
 */
export const normalizePhoneNumber = (phone: string): string => {
  const digits = phone.replace(/[^\d+]/g, '');
  if (!digits) return '';

  if (digits.startsWith('+')) {
    return digits;
  }

  // If 10 digits provided (standard Indian mobile), prepend +91
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // If 11 digits starting with 0, strip leading 0 and prepend +91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }

  return `+${digits}`;
};

// In-memory rate limiting and deduplication cache
interface RateLimitRecord {
  timestamps: number[];
}
const recipientRateLimitMap = new Map<string, RateLimitRecord>();
const globalDispatches: number[] = [];
const deduplicationCache = new Map<string, number>(); // key: `phone:eventId` -> timestamp

const MAX_SMS_PER_RECIPIENT_PER_HOUR = 10;
const MAX_GLOBAL_SMS_PER_HOUR = 100;
const DEDUPLICATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Checks if dispatch violates rate limits or deduplication rules
 */
const checkRateLimitAndDedup = (
  normalizedPhone: string,
  eventId?: string
): { allowed: boolean; reason?: string } => {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;

  // 1. Deduplication check
  if (eventId) {
    const dedupKey = `${normalizedPhone}:${eventId}`;
    const lastSent = deduplicationCache.get(dedupKey);
    if (lastSent && now - lastSent < DEDUPLICATION_WINDOW_MS) {
      return {
        allowed: false,
        reason: `Duplicate SMS suppressed: Message for event '${eventId}' was recently dispatched to recipient.`,
      };
    }
  }

  // 2. Global rate limit
  while (globalDispatches.length > 0 && globalDispatches[0] < oneHourAgo) {
    globalDispatches.shift();
  }
  if (globalDispatches.length >= MAX_GLOBAL_SMS_PER_HOUR) {
    return {
      allowed: false,
      reason: `Global SMS rate limit exceeded (${MAX_GLOBAL_SMS_PER_HOUR}/hour).`,
    };
  }

  // 3. Recipient rate limit
  let recipientHistory = recipientRateLimitMap.get(normalizedPhone);
  if (!recipientHistory) {
    recipientHistory = { timestamps: [] };
    recipientRateLimitMap.set(normalizedPhone, recipientHistory);
  }
  recipientHistory.timestamps = recipientHistory.timestamps.filter((ts) => ts > oneHourAgo);

  if (recipientHistory.timestamps.length >= MAX_SMS_PER_RECIPIENT_PER_HOUR) {
    return {
      allowed: false,
      reason: `Recipient rate limit exceeded (${MAX_SMS_PER_RECIPIENT_PER_HOUR} SMS/hour for this telephone number).`,
    };
  }

  return { allowed: true };
};

/**
 * Records a successful dispatch in rate limiters
 */
const recordDispatch = (normalizedPhone: string, eventId?: string) => {
  const now = Date.now();
  globalDispatches.push(now);
  const recipientHistory = recipientRateLimitMap.get(normalizedPhone);
  if (recipientHistory) {
    recipientHistory.timestamps.push(now);
  }
  if (eventId) {
    deduplicationCache.set(`${normalizedPhone}:${eventId}`, now);
  }
};

/**
 * Production Twilio SMS Driver
 */
export class TwilioSmsProvider implements ISmsProvider {
  private client: twilio.Twilio | null = null;
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private messagingServiceSid?: string;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.authToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    this.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || undefined;

    if (this.accountSid && this.authToken) {
      try {
        this.client = twilio(this.accountSid, this.authToken);
      } catch (err) {
        console.error('[Twilio] Failed to instantiate Twilio client:', err);
      }
    }
  }

  public isConfigured(): boolean {
    return Boolean(
      this.client &&
        this.accountSid &&
        this.authToken &&
        (this.fromNumber || this.messagingServiceSid)
    );
  }

  public async sendSms(to: string, message: string, eventId?: string): Promise<ISmsDispatchResult> {
    const normalizedPhone = normalizePhoneNumber(to);
    const maskedPhone = maskPhoneNumber(normalizedPhone);

    // 1. Validate destination phone
    if (!normalizedPhone || normalizedPhone.length < 8) {
      return {
        success: false,
        messageId: `INVALID-PHONE-${Date.now()}`,
        status: 'FAILED',
        recipientMasked: maskedPhone || 'INVALID',
        error: 'Invalid recipient phone number format.',
        timestamp: new Date(),
      };
    }

    // 2. Validate message content
    if (!message || !message.trim()) {
      return {
        success: false,
        messageId: `EMPTY-MSG-${Date.now()}`,
        status: 'FAILED',
        recipientMasked: maskedPhone,
        error: 'Message body cannot be empty.',
        timestamp: new Date(),
      };
    }

    // 3. Rate limiting and deduplication check
    const rateCheck = checkRateLimitAndDedup(normalizedPhone, eventId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        messageId: `RATE-LIMIT-${Date.now()}`,
        status: 'FAILED',
        recipientMasked: maskedPhone,
        error: rateCheck.reason,
        timestamp: new Date(),
      };
    }

    // 4. Check whether real credentials exist
    if (!this.isConfigured()) {
      const isProduction = process.env.NODE_ENV === 'production';
      if (isProduction) {
        return {
          success: false,
          messageId: 'UNCONFIGURED-PROD',
          status: 'UNAVAILABLE_NO_GATEWAY',
          recipientMasked: maskedPhone,
          error: 'Twilio SMS credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN) are unconfigured in production.',
          notes: 'Cellular SMS transmission requires active Twilio credentials.',
          timestamp: new Date(),
        };
      }

      // Development simulation
      const devMessageId = `SIM-DEV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      recordDispatch(normalizedPhone, eventId);

      console.log(`\n[Twilio Dev Simulator] SMS to ${maskedPhone}: ${message.slice(0, 100)}...`);

      return {
        success: true,
        messageId: devMessageId,
        status: 'SIMULATED_DEV',
        recipientMasked: maskedPhone,
        carrierMessageId: devMessageId,
        notes: 'Simulated dispatch in local development environment.',
        timestamp: new Date(),
      };
    }

    // 5. Send via real Twilio SDK with controlled retries
    let attempts = 0;
    const maxAttempts = 2;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const payload: any = {
          to: normalizedPhone,
          body: message,
        };

        if (this.messagingServiceSid) {
          payload.messagingServiceSid = this.messagingServiceSid;
        } else {
          payload.from = this.fromNumber;
        }

        const twilioMessage = await this.client!.messages.create(payload);
        recordDispatch(normalizedPhone, eventId);

        // Map initial Twilio status ('queued', 'sending', 'sent')
        let initialStatus: ISmsDispatchResult['status'] = 'QUEUED';
        if (twilioMessage.status === 'sent') {
          initialStatus = 'SENT';
        } else if (twilioMessage.status === 'delivered') {
          initialStatus = 'DELIVERED';
        }

        return {
          success: true,
          messageId: twilioMessage.sid,
          status: initialStatus,
          recipientMasked: maskedPhone,
          carrierMessageId: twilioMessage.sid,
          notes: `Dispatched to Twilio gateway (SID: ${twilioMessage.sid}). Awaiting carrier delivery callback.`,
          timestamp: new Date(),
        };
      } catch (err: any) {
        lastError = err;
        console.warn(`[Twilio Dispatch Attempt ${attempts}/${maxAttempts} Failed]:`, err.message || err);
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    }

    return {
      success: false,
      messageId: `TWILIO-ERR-${Date.now()}`,
      status: 'FAILED',
      recipientMasked: maskedPhone,
      error: lastError?.message || 'Twilio cellular gateway rejected message dispatch.',
      timestamp: new Date(),
    };
  }

  public validateWebhookSignature(signature: string, url: string, params: Record<string, any>): boolean {
    if (!this.authToken) return false;
    try {
      return twilio.validateRequest(this.authToken, signature, url, params);
    } catch (err) {
      console.error('[Twilio] Webhook signature validation error:', err);
      return false;
    }
  }
}

/**
 * Mock SMS Provider for automated integration and regression testing
 */
export class MockSmsProvider implements ISmsProvider {
  public dispatchedMessages: Array<{ to: string; message: string; eventId?: string; messageId: string }> = [];
  public shouldSimulateFailure: boolean = false;
  public failureErrorMessage: string = 'Simulated cellular network timeout';

  public async sendSms(to: string, message: string, eventId?: string): Promise<ISmsDispatchResult> {
    const normalizedPhone = normalizePhoneNumber(to);
    const maskedPhone = maskPhoneNumber(normalizedPhone);

    if (this.shouldSimulateFailure) {
      return {
        success: false,
        messageId: `MOCK-FAIL-${Date.now()}`,
        status: 'FAILED',
        recipientMasked: maskedPhone,
        error: this.failureErrorMessage,
        timestamp: new Date(),
      };
    }

    if (!normalizedPhone || normalizedPhone.length < 8) {
      return {
        success: false,
        messageId: `MOCK-INV-${Date.now()}`,
        status: 'FAILED',
        recipientMasked: maskedPhone || 'INVALID',
        error: 'Invalid recipient phone number format.',
        timestamp: new Date(),
      };
    }

    const rateCheck = checkRateLimitAndDedup(normalizedPhone, eventId);
    if (!rateCheck.allowed) {
      return {
        success: false,
        messageId: `MOCK-RATE-${Date.now()}`,
        status: 'FAILED',
        recipientMasked: maskedPhone,
        error: rateCheck.reason,
        timestamp: new Date(),
      };
    }

    const mockSid = `SM_MOCK_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    recordDispatch(normalizedPhone, eventId);
    this.dispatchedMessages.push({ to: normalizedPhone, message, eventId, messageId: mockSid });

    return {
      success: true,
      messageId: mockSid,
      status: 'SENT',
      recipientMasked: maskedPhone,
      carrierMessageId: mockSid,
      notes: 'Mock SMS dispatched successfully during automated test suite execution.',
      timestamp: new Date(),
    };
  }

  public validateWebhookSignature(signature: string, _url: string, _params: Record<string, any>): boolean {
    return signature === 'valid_mock_twilio_signature';
  }
}

// Active SMS provider instance
let activeSmsProvider: ISmsProvider = new TwilioSmsProvider();

export const getSmsProvider = (): ISmsProvider => activeSmsProvider;

export const setSmsProviderForTesting = (provider: ISmsProvider) => {
  activeSmsProvider = provider;
};

export const resetSmsRateLimiters = () => {
  recipientRateLimitMap.clear();
  globalDispatches.length = 0;
  deduplicationCache.clear();
};
