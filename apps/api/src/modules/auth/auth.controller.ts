import { Body, Controller, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ChangePasswordDto, CodeDto, ForgotPasswordDto, LoginDto, PinRequestDto, PinVerifyDto, RegisterDto, ResetPasswordDto, SignupStartDto, SignupVerifyDto } from './dto/auth.dto';
import { SignupService } from './signup.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly signup: SignupService,
  ) {}

  @Public()
  @Post('signup/start')
  @HttpCode(200)
  startSignup(@Body() dto: SignupStartDto) {
    return this.signup.start(dto.email);
  }

  @Public()
  @Post('signup/verify')
  @HttpCode(200)
  verifySignup(@Body() dto: SignupVerifyDto) {
    return this.signup.verify(dto.email, dto.code);
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto, @Res({ passthrough: true }) response: Response) {
    return this.auth.register(dto, response);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.auth.login(dto, response);
  }

  @Public()
  @Post('pin/request')
  @HttpCode(200)
  requestPin(@Body() dto: PinRequestDto) {
    return this.auth.requestPin(dto.plate);
  }

  @Public()
  @Post('pin/verify')
  @HttpCode(200)
  verifyPin(@Body() dto: PinVerifyDto, @Res({ passthrough: true }) response: Response) {
    return this.auth.verifyPin(dto.plate, dto.code, response);
  }

  @Public()
  @Post('refresh')
  @HttpCode(204)
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.refresh(request, response);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request, response);
  }

  @Post('email/send')
  @HttpCode(200)
  sendEmailCode(@CurrentUser() user: AuthUser) {
    return this.auth.sendEmailCode(user.id);
  }

  @Post('email/verify')
  @HttpCode(200)
  verifyEmail(@CurrentUser() user: AuthUser, @Body() dto: CodeDto) {
    return this.auth.verifyEmail(user.id, dto.code);
  }

  @Post('phone/send')
  @HttpCode(200)
  sendPhoneCode(@CurrentUser() user: AuthUser) {
    return this.auth.sendPhoneCode(user.id);
  }

  @Post('phone/verify')
  @HttpCode(200)
  verifyPhone(@CurrentUser() user: AuthUser, @Body() dto: CodeDto) {
    return this.auth.verifyPhone(user.id, dto.code);
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(202)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.login);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(200)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto.token, dto.password);
  }
}

@ApiTags('me')
@Controller('me')
export class MeSecurityController {
  constructor(private readonly auth: AuthService) {}

  @Post('password')
  @HttpCode(200)
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto.currentPassword, dto.password);
  }

  @Post('password-link')
  @HttpCode(202)
  sendPasswordLink(@CurrentUser() user: AuthUser) {
    return this.auth.sendPasswordLinkTo(user.id);
  }
}
