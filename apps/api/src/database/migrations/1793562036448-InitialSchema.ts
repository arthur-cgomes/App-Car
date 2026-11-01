import { MigrationInterface, QueryRunner } from 'typeorm';

const CATEGORIES = [
  ['FUEL', 'Combustível', 'fuel', '#023379'],
  ['MAINTENANCE', 'Manutenção', 'wrench', '#346cc4'],
  ['PARTS', 'Peças', 'cog', '#164ea3'],
  ['DOCUMENTS', 'Documentos', 'file-text', '#5d8fde'],
  ['FINES', 'Multas e débitos', 'triangle-alert', '#8bb2f1'],
  ['INSURANCE', 'Seguro', 'shield', '#5d5d60'],
  ['OTHER', 'Outros', 'tag', '#98989b'],
];

export class InitialSchema1793562036448 implements MigrationInterface {
  name = 'InitialSchema1793562036448';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "entity" character varying(100) NOT NULL, "entity_id" uuid, "action" character varying(20) NOT NULL, "changes" jsonb, "snapshot" jsonb, "user_id" uuid, "ip" character varying(64), "user_agent" character varying(512), "request_id" character varying(64), CONSTRAINT "pk_audit_logs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_user_id_created_at" ON "audit_logs" ("user_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_logs_entity_entity_id_created_at" ON "audit_logs" ("entity", "entity_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "name" character varying(120) NOT NULL, "email" character varying(254) NOT NULL, "cpf" character varying(11), "phone" character varying(20), "password_hash" character varying(255) NOT NULL, "phone_verified_at" TIMESTAMP WITH TIME ZONE, "avatar_file_id" uuid, "theme" character varying(5) NOT NULL DEFAULT 'DARK', "sms_login_enabled" boolean NOT NULL DEFAULT true, "active_vehicle_id" uuid, "terms_accepted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_users" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_phone_verified" ON "users" ("phone") WHERE "deleted_at" IS NULL AND "phone_verified_at" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_cpf" ON "users" ("cpf") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "user_id" uuid NOT NULL, "name" character varying(60) NOT NULL, "prefix" character varying(16) NOT NULL, "key_hash" character(64) NOT NULL, "last_used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_api_keys" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_api_keys_key_hash" ON "api_keys" ("key_hash") `,
    );
    await queryRunner.query(`CREATE INDEX "idx_api_keys_user_id" ON "api_keys" ("user_id") `);
    await queryRunner.query(
      `CREATE TABLE "auth_otps" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "vehicle_id" uuid, "purpose" character varying(20) NOT NULL, "target_phone" character varying(20) NOT NULL, "code_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "attempts" smallint NOT NULL DEFAULT '0', "consumed_at" TIMESTAMP WITH TIME ZONE, "ip" character varying(64), CONSTRAINT "pk_auth_otps" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_auth_otps_user_id_purpose_created_at" ON "auth_otps" ("user_id", "purpose", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "used_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_password_reset_tokens" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_password_reset_tokens_token_hash" ON "password_reset_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "token_hash" character(64) NOT NULL, "family_id" uuid NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, "user_agent" character varying(512), "ip" character varying(64), CONSTRAINT "pk_refresh_tokens" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_refresh_tokens_family_id" ON "refresh_tokens" ("family_id") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_refresh_tokens_token_hash" ON "refresh_tokens" ("token_hash") `,
    );
    await queryRunner.query(
      `CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "owner_id" uuid NOT NULL, "storage_key" character varying(200) NOT NULL, "mime" character varying(50) NOT NULL, "size" integer NOT NULL, "sha256" character(64) NOT NULL, CONSTRAINT "pk_files" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_files_owner_id" ON "files" ("owner_id") `);
    await queryRunner.query(
      `CREATE TABLE "expense_attachments" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "expense_id" uuid NOT NULL, "file_id" uuid NOT NULL, "position" smallint NOT NULL DEFAULT '0', CONSTRAINT "pk_expense_attachments" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_expense_attachments_expense_id_position" ON "expense_attachments" ("expense_id", "position") `,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "owner_id" uuid NOT NULL, "plate" character varying(7) NOT NULL, "renavam" character varying(11), "brand" character varying(60), "model" character varying(80), "model_version" character varying(120), "year_fab" smallint, "year_model" smallint, "color" character varying(30), "fuel_type" character varying(20), "municipality" character varying(80), "uf" character(2), "restrictions" character varying(120), "fipe_code" character varying(10), "fipe_value_cents" integer, "fipe_ref_month" character varying(7), "current_odometer" integer NOT NULL DEFAULT '0', "purchase_date" date, "base_odometer" integer NOT NULL DEFAULT '0', "service_interval_km" integer NOT NULL DEFAULT '10000', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "pk_vehicles" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`CREATE INDEX "idx_vehicles_owner_id" ON "vehicles" ("owner_id") `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_vehicles_plate_active" ON "vehicles" ("plate") WHERE "active" = true AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "expense_categories" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "code" character varying(30) NOT NULL, "name" character varying(60) NOT NULL, "icon" character varying(40) NOT NULL, "color" character varying(9) NOT NULL, "sort_order" smallint NOT NULL DEFAULT '0', CONSTRAINT "pk_expense_categories" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_expense_categories_code" ON "expense_categories" ("code") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "fuel_logs" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "expense_id" uuid NOT NULL, "liters" numeric(7,2) NOT NULL, "full_tank" boolean NOT NULL DEFAULT false, CONSTRAINT "REL_b1f721843415530b4fb9d4cb06" UNIQUE ("expense_id"), CONSTRAINT "pk_fuel_logs" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_fuel_logs_expense_id" ON "fuel_logs" ("expense_id") WHERE "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "expenses" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "vehicle_id" uuid NOT NULL, "category_id" uuid NOT NULL, "description" character varying(200), "amount_cents" integer NOT NULL, "date" date NOT NULL, "odometer" integer, "occurred_at" TIMESTAMP WITH TIME ZONE, "establishment" character varying(120), "parts_cents" integer, "labor_cents" integer, "external_id" character varying(80), "part_system" character varying(20), "source" character varying(10) NOT NULL DEFAULT 'MANUAL', "notes" text, CONSTRAINT "pk_expenses" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_expenses_vehicle_id_external_id" ON "expenses" ("vehicle_id", "external_id") WHERE "external_id" IS NOT NULL AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_vehicle_id_part_system" ON "expenses" ("vehicle_id", "part_system") WHERE "part_system" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_vehicle_id_category_id" ON "expenses" ("vehicle_id", "category_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_expenses_vehicle_id_date" ON "expenses" ("vehicle_id", "date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "documents" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "vehicle_id" uuid NOT NULL, "type" character varying(12) NOT NULL, "year" smallint, "amount_cents" integer, "due_date" date, "paid_at" date, "expense_id" uuid, "file_id" uuid, "notes" character varying(300), CONSTRAINT "pk_documents" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_documents_vehicle_id_type_year" ON "documents" ("vehicle_id", "type", "year") `,
    );
    await queryRunner.query(
      `CREATE TABLE "emergency_contacts" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "vehicle_id" uuid NOT NULL, "kind" character varying(20) NOT NULL, "name" character varying(80) NOT NULL, "phone" character varying(30) NOT NULL, "notes" character varying(200), CONSTRAINT "pk_emergency_contacts" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_emergency_contacts_vehicle_id" ON "emergency_contacts" ("vehicle_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "insurances" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "vehicle_id" uuid NOT NULL, "insurer" character varying(80) NOT NULL, "policy_number" character varying(60), "start_date" date NOT NULL, "end_date" date NOT NULL, "premium_cents" integer, "installments" smallint, "deductible_cents" integer, "broker_contact" character varying(120), "file_id" uuid, CONSTRAINT "pk_insurances" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_insurances_vehicle_id_end_date" ON "insurances" ("vehicle_id", "end_date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "reminders" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, "created_by" uuid, "updated_by" uuid, "version" integer NOT NULL DEFAULT '1', "vehicle_id" uuid NOT NULL, "category_code" character varying(20) NOT NULL, "title" character varying(120) NOT NULL, "source" character varying(20) NOT NULL, "source_key" character varying(120), "due_date" date, "due_odometer" integer, "amount_cents" integer, "repeat_months" smallint, "repeat_km" integer, "done_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "pk_reminders" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reminders_vehicle_id_done_at" ON "reminders" ("vehicle_id", "done_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_reminders_vehicle_id_source_key" ON "reminders" ("vehicle_id", "source_key") WHERE "source_key" IS NOT NULL AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "plate_lookup_history" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "plate" character varying(7) NOT NULL, CONSTRAINT "pk_plate_lookup_history" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_plate_lookup_history_user_id_updated_at" ON "plate_lookup_history" ("user_id", "updated_at") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_plate_lookup_history_user_id_plate" ON "plate_lookup_history" ("user_id", "plate") `,
    );
    await queryRunner.query(
      `CREATE TABLE "plate_lookups" ("id" uuid NOT NULL DEFAULT gen_random_uuid(), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "plate" character varying(7) NOT NULL, "kind" character varying(10) NOT NULL, "provider" character varying(30) NOT NULL, "payload" jsonb, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "pk_plate_lookups" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_plate_lookups_plate_kind_expires_at" ON "plate_lookups" ("plate", "kind", "expires_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "fk_api_keys_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_otps" ADD CONSTRAINT "fk_auth_otps_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "fk_password_reset_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "fk_refresh_tokens_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "files" ADD CONSTRAINT "fk_files_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense_attachments" ADD CONSTRAINT "fk_expense_attachments_expense_id" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense_attachments" ADD CONSTRAINT "fk_expense_attachments_file_id" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "fk_vehicles_owner_id" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "fuel_logs" ADD CONSTRAINT "fk_fuel_logs_expense_id" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_category_id" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "fk_documents_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD CONSTRAINT "fk_documents_file_id" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "emergency_contacts" ADD CONSTRAINT "fk_emergency_contacts_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "insurances" ADD CONSTRAINT "fk_insurances_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "insurances" ADD CONSTRAINT "fk_insurances_file_id" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reminders" ADD CONSTRAINT "fk_reminders_vehicle_id" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "plate_lookup_history" ADD CONSTRAINT "fk_plate_lookup_history_user_id" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_audit_log_mutation() RETURNS trigger AS $$
      BEGIN
        IF TG_OP = 'DELETE' AND current_setting('placar.audit_purge', true) = 'on' THEN
          RETURN OLD;
        END IF;
        RAISE EXCEPTION 'audit_logs é append-only: % não permitido', TG_OP;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER trg_audit_logs_append_only
      BEFORE UPDATE OR DELETE ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation()
    `);

    for (const [index, [code, name, icon, color]] of CATEGORIES.entries()) {
      await queryRunner.query(
        `INSERT INTO "expense_categories" ("code", "name", "icon", "color", "sort_order") VALUES ($1, $2, $3, $4, $5)`,
        [code, name, icon, color, index],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER "trg_audit_logs_append_only" ON "audit_logs"`);
    await queryRunner.query(`DROP FUNCTION prevent_audit_log_mutation()`);
    await queryRunner.query(
      `ALTER TABLE "plate_lookup_history" DROP CONSTRAINT "fk_plate_lookup_history_user_id"`,
    );
    await queryRunner.query(`ALTER TABLE "reminders" DROP CONSTRAINT "fk_reminders_vehicle_id"`);
    await queryRunner.query(`ALTER TABLE "insurances" DROP CONSTRAINT "fk_insurances_file_id"`);
    await queryRunner.query(`ALTER TABLE "insurances" DROP CONSTRAINT "fk_insurances_vehicle_id"`);
    await queryRunner.query(
      `ALTER TABLE "emergency_contacts" DROP CONSTRAINT "fk_emergency_contacts_vehicle_id"`,
    );
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "fk_documents_file_id"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT "fk_documents_vehicle_id"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "fk_expenses_category_id"`);
    await queryRunner.query(`ALTER TABLE "expenses" DROP CONSTRAINT "fk_expenses_vehicle_id"`);
    await queryRunner.query(`ALTER TABLE "fuel_logs" DROP CONSTRAINT "fk_fuel_logs_expense_id"`);
    await queryRunner.query(`ALTER TABLE "vehicles" DROP CONSTRAINT "fk_vehicles_owner_id"`);
    await queryRunner.query(
      `ALTER TABLE "expense_attachments" DROP CONSTRAINT "fk_expense_attachments_file_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "expense_attachments" DROP CONSTRAINT "fk_expense_attachments_expense_id"`,
    );
    await queryRunner.query(`ALTER TABLE "files" DROP CONSTRAINT "fk_files_owner_id"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "fk_refresh_tokens_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "fk_password_reset_tokens_user_id"`,
    );
    await queryRunner.query(`ALTER TABLE "auth_otps" DROP CONSTRAINT "fk_auth_otps_user_id"`);
    await queryRunner.query(`ALTER TABLE "api_keys" DROP CONSTRAINT "fk_api_keys_user_id"`);
    await queryRunner.query(`DROP INDEX "idx_plate_lookups_plate_kind_expires_at"`);
    await queryRunner.query(`DROP TABLE "plate_lookups"`);
    await queryRunner.query(`DROP INDEX "uq_plate_lookup_history_user_id_plate"`);
    await queryRunner.query(`DROP INDEX "idx_plate_lookup_history_user_id_updated_at"`);
    await queryRunner.query(`DROP TABLE "plate_lookup_history"`);
    await queryRunner.query(`DROP INDEX "uq_reminders_vehicle_id_source_key"`);
    await queryRunner.query(`DROP INDEX "idx_reminders_vehicle_id_done_at"`);
    await queryRunner.query(`DROP TABLE "reminders"`);
    await queryRunner.query(`DROP INDEX "idx_insurances_vehicle_id_end_date"`);
    await queryRunner.query(`DROP TABLE "insurances"`);
    await queryRunner.query(`DROP INDEX "idx_emergency_contacts_vehicle_id"`);
    await queryRunner.query(`DROP TABLE "emergency_contacts"`);
    await queryRunner.query(`DROP INDEX "idx_documents_vehicle_id_type_year"`);
    await queryRunner.query(`DROP TABLE "documents"`);
    await queryRunner.query(`DROP INDEX "idx_expenses_vehicle_id_date"`);
    await queryRunner.query(`DROP INDEX "idx_expenses_vehicle_id_category_id"`);
    await queryRunner.query(`DROP INDEX "idx_expenses_vehicle_id_part_system"`);
    await queryRunner.query(`DROP INDEX "uq_expenses_vehicle_id_external_id"`);
    await queryRunner.query(`DROP TABLE "expenses"`);
    await queryRunner.query(`DROP INDEX "uq_fuel_logs_expense_id"`);
    await queryRunner.query(`DROP TABLE "fuel_logs"`);
    await queryRunner.query(`DROP INDEX "uq_expense_categories_code"`);
    await queryRunner.query(`DROP TABLE "expense_categories"`);
    await queryRunner.query(`DROP INDEX "uq_vehicles_plate_active"`);
    await queryRunner.query(`DROP INDEX "idx_vehicles_owner_id"`);
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP INDEX "idx_expense_attachments_expense_id_position"`);
    await queryRunner.query(`DROP TABLE "expense_attachments"`);
    await queryRunner.query(`DROP INDEX "idx_files_owner_id"`);
    await queryRunner.query(`DROP TABLE "files"`);
    await queryRunner.query(`DROP INDEX "uq_refresh_tokens_token_hash"`);
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_family_id"`);
    await queryRunner.query(`DROP INDEX "idx_refresh_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "uq_password_reset_tokens_token_hash"`);
    await queryRunner.query(`DROP INDEX "idx_password_reset_tokens_user_id"`);
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`DROP INDEX "idx_auth_otps_user_id_purpose_created_at"`);
    await queryRunner.query(`DROP TABLE "auth_otps"`);
    await queryRunner.query(`DROP INDEX "idx_api_keys_user_id"`);
    await queryRunner.query(`DROP INDEX "uq_api_keys_key_hash"`);
    await queryRunner.query(`DROP TABLE "api_keys"`);
    await queryRunner.query(`DROP INDEX "uq_users_email"`);
    await queryRunner.query(`DROP INDEX "uq_users_cpf"`);
    await queryRunner.query(`DROP INDEX "uq_users_phone_verified"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "idx_audit_logs_entity_entity_id_created_at"`);
    await queryRunner.query(`DROP INDEX "idx_audit_logs_user_id_created_at"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
