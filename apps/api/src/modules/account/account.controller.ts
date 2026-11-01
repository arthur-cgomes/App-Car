import { Body, Controller, Delete, Get, HttpCode, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CodeDto } from '../auth/dto/auth.dto';
import { ChangePhoneDto, DeleteAccountDto, UpdateProfileDto } from './account.dto';
import { AccountService } from './account.service';

@ApiTags('me')
@Controller('me')
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get()
  async me(@CurrentUser() user: AuthUser) {
    return this.account.view(await this.account.me(user.id));
  }

  @Patch()
  async update(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.account.view(await this.account.update(user.id, dto));
  }

  @Post('phone')
  @HttpCode(200)
  requestPhoneChange(@CurrentUser() user: AuthUser, @Body() dto: ChangePhoneDto) {
    return this.account.requestPhoneChange(user.id, dto.phone);
  }

  @Post('phone/confirm')
  @HttpCode(200)
  async confirmPhoneChange(@CurrentUser() user: AuthUser, @Body() dto: CodeDto) {
    return this.account.view(await this.account.confirmPhoneChange(user.id, dto.code));
  }

  @Get('export')
  async export(@CurrentUser() user: AuthUser, @Res({ passthrough: true }) response: Response) {
    response.set({
      'Content-Disposition': `attachment; filename="placar-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    });
    return this.account.export(user.id);
  }

  @Post('delete/request')
  @HttpCode(200)
  requestDeletion(@CurrentUser() user: AuthUser) {
    return this.account.requestDeletion(user.id);
  }

  @Delete()
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.account.delete(user.id, dto, request, response);
  }
}
