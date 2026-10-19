import { Logger } from '@nestjs/common';

/** Sends OTP codes (trd §8 MessagingProvider, SMS part). One adapter per vendor. */
export interface SmsSender {
  sendOtp(phone: string, code: string): Promise<void>;
}
export const SMS_SENDER = Symbol('SMS_SENDER');

/**
 * Development/test adapter: logs the code instead of sending it, and remembers the latest code
 * per phone so e2e tests can read it. Env validation forbids it in production.
 */
export class ConsoleSmsSender implements SmsSender {
  private readonly log = new Logger('Sms');
  private readonly last = new Map<string, string>();

  async sendOtp(phone: string, code: string) {
    this.last.set(phone, code);
    // Mask the number: never log full phone numbers (rules.md §3).
    this.log.warn(`DEV OTP for ••••${phone.slice(-4)}: ${code}`);
  }

  lastCode(phone: string) {
    return this.last.get(phone);
  }
}
