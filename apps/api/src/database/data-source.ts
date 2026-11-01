import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './options';

const envFile = join(__dirname, '..', '..', '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não definida');

export default new DataSource(buildDataSourceOptions(process.env.DATABASE_URL));
