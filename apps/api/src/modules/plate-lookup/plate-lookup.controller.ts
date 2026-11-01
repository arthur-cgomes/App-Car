import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../../common/auth/auth-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParsePlatePipe } from '../../common/pipes/parse-plate.pipe';
import { PlateLookupService } from './plate-lookup.service';

@ApiTags('plates')
@Controller('plates')
export class PlateLookupController {
  constructor(private readonly plates: PlateLookupService) {}

  @Get('history')
  history(@CurrentUser() user: AuthUser) {
    return this.plates.recent(user.id);
  }

  @Post(':plate/vehicle')
  @HttpCode(200)
  vehicle(@CurrentUser() user: AuthUser, @Param('plate', ParsePlatePipe) plate: string) {
    return this.plates.vehicle(user.id, plate);
  }

  @Post(':plate/lookup')
  @HttpCode(200)
  lookup(@CurrentUser() user: AuthUser, @Param('plate', ParsePlatePipe) plate: string) {
    return this.plates.consult(user.id, plate);
  }
}
