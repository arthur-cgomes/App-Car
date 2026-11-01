import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { maskBrPhone } from '@monitoring-car/shared';
import type { Request, Response } from 'express';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { AuditLog } from '../../audit/audit-log.entity';
import { AuditService } from '../../audit/audit.service';
import { RateLimiter } from '../../infra/redis/rate-limiter';
import { OTP_RESEND_SECONDS, OtpService } from '../auth/otp.service';
import { PasswordService } from '../auth/password.service';
import { SessionService } from '../auth/session.service';
import { VehicleDocument } from '../documents/vehicle-document.entity';
import { Expense } from '../expenses/expense.entity';
import { StoredFile } from '../files/file.entity';
import { ApiKey } from '../api-keys/api-key.entity';
import { EmergencyContact } from '../emergency-contacts/emergency-contact.entity';
import { Insurance } from '../insurances/insurance.entity';
import { PlateLookupHistory } from '../plate-lookup/entities/plate-lookup-history.entity';
import { Reminder } from '../reminders/reminder.entity';
import { User } from '../users/user.entity';
import { Vehicle } from '../vehicles/vehicle.entity';
import { UpdateProfileDto } from './account.dto';

const resendMessage = (seconds: number) => `Aguarde ${seconds} s para pedir um novo código.`;

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(StoredFile) private readonly files: Repository<StoredFile>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly otps: OtpService,
    private readonly sessions: SessionService,
    private readonly passwords: PasswordService,
    private readonly limiter: RateLimiter,
    private readonly audit: AuditService,
  ) {}

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    return user;
  }

  async update(userId: string, dto: UpdateProfileDto) {
    const user = await this.me(userId);
    if (dto.email && dto.email !== user.email && (await this.users.exists({ where: { email: dto.email } }))) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }
    if (dto.cpf && dto.cpf !== user.cpf && (await this.users.exists({ where: { cpf: dto.cpf } }))) {
      throw new ConflictException('Já existe uma conta com este CPF.');
    }
    if (dto.avatarFileId) {
      const image = await this.files.findOne({ where: { id: dto.avatarFileId, ownerId: userId } });
      if (!image || !image.mime.startsWith('image/')) throw new BadRequestException('Escolha uma foto para o perfil.');
    }
    return this.users.save(this.users.merge(user, dto));
  }

  async requestPhoneChange(userId: string, phone: string) {
    const user = await this.me(userId);
    if (phone === user.phone && user.phoneVerifiedAt) throw new BadRequestException('Este já é o seu celular.');
    if (await this.users.exists({ where: { phone, phoneVerifiedAt: Not(IsNull()), id: Not(userId) } })) {
      throw new ConflictException('Este celular já está em uso em outra conta.');
    }
    await this.limiter.cooldown(`phone-change:${userId}`, OTP_RESEND_SECONDS, resendMessage);
    await this.otps.issue({ userId, purpose: 'PHONE_CHANGE', phone });
    return { maskedPhone: maskBrPhone(phone), resendIn: OTP_RESEND_SECONDS };
  }

  async confirmPhoneChange(userId: string, code: string) {
    const otp = await this.otps.verify(userId, 'PHONE_CHANGE', code);
    if (await this.users.exists({ where: { phone: otp.targetPhone, phoneVerifiedAt: Not(IsNull()), id: Not(userId) } })) {
      throw new ConflictException('Este celular já está em uso em outra conta.');
    }
    const user = await this.me(userId);
    user.phone = otp.targetPhone;
    user.phoneVerifiedAt = new Date();
    await this.users.save(user);
    await this.audit.logSecurityEvent('PHONE_CHANGED', {}, userId);
    return user;
  }

  async export(userId: string) {
    const manager = this.dataSource.manager;
    const user = await this.me(userId);
    const vehicles = await manager.find(Vehicle, { where: { ownerId: userId }, withDeleted: true });
    const vehicleIds = vehicles.map((v) => v.id);
    const ofVehicles = { vehicleId: In(vehicleIds) };
    return {
      exportedAt: new Date().toISOString(),
      profile: {
        name: user.name,
        email: user.email,
        cpf: user.cpf,
        phone: user.phone,
        phoneVerifiedAt: user.phoneVerifiedAt,
        termsAcceptedAt: user.termsAcceptedAt,
        createdAt: user.createdAt,
        theme: user.theme,
        smsLoginEnabled: user.smsLoginEnabled,
      },
      vehicles,
      expenses: await manager.find(Expense, { where: ofVehicles, relations: { category: true, attachments: true, fuel: true }, withDeleted: true }),
      reminders: await manager.find(Reminder, { where: ofVehicles, withDeleted: true }),
      documents: await manager.find(VehicleDocument, { where: ofVehicles, withDeleted: true }),
      insurances: await manager.find(Insurance, { where: ofVehicles, withDeleted: true }),
      emergencyContacts: await manager.find(EmergencyContact, { where: ofVehicles, withDeleted: true }),
      apiKeys: await manager.find(ApiKey, { where: { userId }, withDeleted: true }),
      files: await manager.find(StoredFile, { where: { ownerId: userId }, select: { id: true, mime: true, size: true, createdAt: true } }),
      plateLookups: await manager.find(PlateLookupHistory, { where: { userId }, select: { plate: true, updatedAt: true } }),
      securityEvents: (await manager.find(AuditLog, { where: { userId, action: 'SECURITY' }, order: { createdAt: 'DESC' } })).map((log) => ({
        event: (log.snapshot as { event?: string } | null)?.event,
        at: log.createdAt,
        ip: log.ip,
        userAgent: log.userAgent,
      })),
    };
  }

  async requestDeletion(userId: string) {
    const user = await this.me(userId);
    if (!user.phone || !user.phoneVerifiedAt) return { method: 'password' as const };
    await this.limiter.cooldown(`account-delete:${userId}`, OTP_RESEND_SECONDS, resendMessage);
    await this.otps.issue({ userId, purpose: 'ACCOUNT_DELETE', phone: user.phone });
    return { method: 'sms' as const, maskedPhone: maskBrPhone(user.phone), resendIn: OTP_RESEND_SECONDS };
  }

  async delete(userId: string, proof: { code?: string; password?: string }, request: Request, response: Response) {
    const user = await this.users.findOne({ where: { id: userId }, select: { id: true, phone: true, phoneVerifiedAt: true, passwordHash: true } });
    if (!user) throw new NotFoundException();
    if (user.phone && user.phoneVerifiedAt) {
      if (!proof.code) throw new BadRequestException('Digite os 6 dígitos do código.');
      await this.otps.verify(userId, 'ACCOUNT_DELETE', proof.code);
    } else if (!(await this.passwords.verify(user.passwordHash, proof.password ?? ''))) {
      throw new UnauthorizedException('Senha incorreta.');
    }

    await this.dataSource.transaction(async (manager) => {
      const vehicles = await manager.find(Vehicle, { where: { ownerId: userId } });
      for (const vehicle of vehicles) {
        vehicle.active = false;
        await manager.save(vehicle);
        await manager.softRemove(vehicle);
      }
      await manager.softRemove(await manager.findOneByOrFail(User, { id: userId }));
    });
    await this.audit.logSecurityEvent('ACCOUNT_DELETED', {}, userId);
    await this.sessions.endAll(userId);
    await this.sessions.end(request, response);
  }
}
