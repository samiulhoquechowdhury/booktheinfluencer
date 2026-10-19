import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthGuard, RolesGuard } from './guards';
import { OtpService } from './otp.service';
import { StaffAuthService } from './staff-auth.service';
import { ConsoleSmsSender, SMS_SENDER } from './sms';
import { TokensService } from './tokens.service';

@Module({
  controllers: [AuthController],
  providers: [
    OtpService,
    StaffAuthService,
    TokensService,
    // Only the console adapter exists until an SMS vendor is chosen (memory.md open questions).
    { provide: SMS_SENDER, useClass: ConsoleSmsSender },
    // Order matters: sign-in first, then roles.
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [TokensService, OtpService, SMS_SENDER],
})
export class AuthModule {}
