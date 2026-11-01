import { Injectable } from '@nestjs/common';
import { hash, verify } from '@node-rs/argon2';

@Injectable()
export class PasswordService {
  private readonly dummyHash = hash('placar-dummy-password');

  hash(password: string) {
    return hash(password);
  }

  async verify(passwordHash: string | null | undefined, password: string) {
    if (!passwordHash) {
      await verify(await this.dummyHash, password).catch(() => false);
      return false;
    }
    return verify(passwordHash, password).catch(() => false);
  }
}
