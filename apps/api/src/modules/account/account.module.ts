import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { StoredFile } from '../files/file.entity';
import { User } from '../users/user.entity';
import { AccountPurgeService } from './account-purge.service';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, StoredFile]), AuthModule],
  controllers: [AccountController],
  providers: [AccountService, AccountPurgeService],
  exports: [AccountPurgeService],
})
export class AccountModule {}
