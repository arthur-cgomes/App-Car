import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { StorageService } from '../../infra/storage/storage.service';

export const PURGE_AFTER_DAYS = 30;

@Injectable()
export class AccountPurgeService {
  private readonly logger = new Logger('LimpezaLGPD');

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  async purgeExpired(now = new Date()) {
    const cutoff = new Date(now.getTime() - PURGE_AFTER_DAYS * 86_400_000);
    const users: { id: string }[] = await this.dataSource.query('SELECT id FROM users WHERE deleted_at IS NOT NULL AND deleted_at < $1', [cutoff]);
    for (const { id } of users) await this.purgeUser(id);
    return users.length;
  }

  private async purgeUser(userId: string) {
    const storageKeys = await this.dataSource.transaction(async (manager) => {
      const q = (sql: string, params: unknown[] = []) => manager.query(sql, params);
      await q(`SELECT set_config('placar.audit_purge', 'on', true)`);

      const vehicles = (await q('SELECT id FROM vehicles WHERE owner_id = $1', [userId])).map((r: { id: string }) => r.id);
      const ids = async (sql: string) => (await q(sql, [vehicles])).map((r: { id: string }) => r.id) as string[];
      const expenses = await ids('SELECT id FROM expenses WHERE vehicle_id = ANY($1)');
      const entityIds = [
        userId,
        ...vehicles,
        ...expenses,
        ...(await q('SELECT id FROM expense_attachments WHERE expense_id = ANY($1)', [expenses])).map((r: { id: string }) => r.id),
        ...(await q('SELECT id FROM fuel_logs WHERE expense_id = ANY($1)', [expenses])).map((r: { id: string }) => r.id),
        ...(await ids('SELECT id FROM reminders WHERE vehicle_id = ANY($1)')),
        ...(await ids('SELECT id FROM documents WHERE vehicle_id = ANY($1)')),
        ...(await ids('SELECT id FROM insurances WHERE vehicle_id = ANY($1)')),
        ...(await ids('SELECT id FROM emergency_contacts WHERE vehicle_id = ANY($1)')),
        ...(await ids('SELECT id FROM tires WHERE vehicle_id = ANY($1)')),
        ...(await ids('SELECT id FROM tire_events WHERE vehicle_id = ANY($1)')),
        ...(await ids('SELECT id FROM tire_rotations WHERE vehicle_id = ANY($1)')),
        ...(await q('SELECT id FROM api_keys WHERE user_id = $1', [userId])).map((r: { id: string }) => r.id),
      ];
      const files: { id: string; storage_key: string }[] = await q('SELECT id, storage_key FROM files WHERE owner_id = $1', [userId]);
      entityIds.push(...files.map((f) => f.id));

      await q('DELETE FROM audit_logs WHERE user_id = $1 OR entity_id = ANY($2)', [userId, entityIds]);
      await q('DELETE FROM expenses WHERE vehicle_id = ANY($1)', [vehicles]);
      await q('DELETE FROM vehicles WHERE owner_id = $1', [userId]);
      await q('DELETE FROM files WHERE owner_id = $1', [userId]);
      await q('DELETE FROM users WHERE id = $1', [userId]);
      return files.map((f) => f.storage_key);
    });

    for (const key of storageKeys) {
      await this.storage.delete(key).catch((error: Error) => this.logger.warn(`Arquivo ${key} não removido do armazenamento: ${error.message}`));
    }
    this.logger.log(`Conta ${userId} apagada definitivamente (${storageKeys.length} arquivos)`);
  }
}
