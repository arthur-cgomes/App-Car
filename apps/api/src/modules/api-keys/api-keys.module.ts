import { Body, Controller, Delete, Get, Global, HttpCode, Module, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiKey } from './api-key.entity';
import { ApiKeysService } from './api-keys.service';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'App de abastecimento' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Length(2, 60, { message: 'Dê um nome para a chave.' })
  name: string;
}

@ApiTags('api-keys')
@Controller('me/api-keys')
export class ApiKeysController {
  constructor(private readonly keys: ApiKeysService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.keys.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateApiKeyDto) {
    return this.keys.create(user.id, dto.name);
  }

  @Delete(':id')
  @HttpCode(204)
  revoke(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.keys.revoke(user.id, id);
  }
}

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([ApiKey])],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
