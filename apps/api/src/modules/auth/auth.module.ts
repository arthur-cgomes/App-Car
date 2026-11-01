import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { AuthController, MeSecurityController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthOtp } from './entities/auth-otp.entity';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { OtpService } from './otp.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Vehicle, RefreshToken, AuthOtp, PasswordResetToken])],
  controllers: [AuthController, MeSecurityController],
  providers: [AuthService, SessionService, OtpService, PasswordService],
  exports: [SessionService, OtpService, PasswordService],
})
export class AuthModule {}
