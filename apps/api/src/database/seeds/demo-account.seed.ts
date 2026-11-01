import { INestApplicationContext } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { PasswordService } from '../../modules/auth/password.service';
import { Reminder } from '../../modules/reminders/reminder.entity';
import { User } from '../../modules/users/user.entity';
import { Vehicle } from '../../modules/vehicles/vehicle.entity';
import { VehiclesService } from '../../modules/vehicles/vehicles.service';

export const DEMO_ACCOUNT = {
  name: 'Arthur Gomes',
  email: 'motorista.p0wdv1@appcar.test',
  password: 'XDN0lM5YG*7o',
  cpf: '52998224725',
  phone: '+5521999990001',
};

export const DEMO_VEHICLE = { plate: 'RIO2A18', currentOdometer: 108_000 };

export async function seedDemoAccount(app: INestApplicationContext) {
  const users = app.get<Repository<User>>(getRepositoryToken(User));
  const vehicles = app.get<Repository<Vehicle>>(getRepositoryToken(Vehicle));

  const user =
    (await users.findOne({ where: { email: DEMO_ACCOUNT.email } })) ??
    (await users.findOne({ where: { cpf: DEMO_ACCOUNT.cpf } })) ??
    users.create({ termsAcceptedAt: new Date() });
  Object.assign(user, {
    name: DEMO_ACCOUNT.name,
    email: DEMO_ACCOUNT.email,
    cpf: DEMO_ACCOUNT.cpf,
    phone: DEMO_ACCOUNT.phone,
    phoneVerifiedAt: user.phoneVerifiedAt ?? new Date(),
    emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    pinLoginEnabled: true,
    pinChannel: 'EMAIL',
    passwordHash: await app.get(PasswordService).hash(DEMO_ACCOUNT.password),
  });
  await users.save(user);

  const service = app.get(VehiclesService);
  const existing = await vehicles.findOne({ where: { ownerId: user.id, plate: DEMO_VEHICLE.plate, active: true } });
  if (!existing) {
    await service.create(user.id, DEMO_VEHICLE);
    return user;
  }
  const fipe = existing.fipeCode === '005476-3' ? {} : { fipeCode: '005476-3', fipeValueCents: null, fipeRefMonth: null };
  await service.updateOwned(user.id, existing.id, {
    brand: 'Volkswagen',
    model: 'Polo Highline 1.0 200 TSI',
    yearFab: 2019,
    yearModel: 2019,
    color: 'Prata',
    fuelType: 'Flex',
    ...fipe,
    currentOdometer: Math.max(existing.baseOdometer, DEMO_VEHICLE.currentOdometer),
  });
  await service.activate(user.id, existing.id);
  const reminders = app.get<Repository<Reminder>>(getRepositoryToken(Reminder));
  const stale = await reminders.find({
    where: { vehicleId: existing.id, source: 'AUTO_SERVICE', doneAt: IsNull(), dueOdometer: LessThanOrEqual(DEMO_VEHICLE.currentOdometer) },
  });
  await reminders.save(stale.map((reminder) => reminders.merge(reminder, { doneAt: new Date() })));
  return user;
}
