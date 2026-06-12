import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { CrimeIncident } from '../models/crime.model';
import { AuditLog } from '../models/audit.model';
import { PredictionRecord } from '../models/prediction.model';
import { ModelMetadataRecord } from '../models/model-metadata.model';
import { AlertRecord } from '../models/alert.model';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
const dbUser = process.env.DB_USERNAME || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'dev_password';
const dbName = process.env.DB_NAME || 'crime_hotspot';

if (isProduction) {
  if (dbPassword === 'dev_password' || dbUser === 'postgres' || dbHost === 'localhost') {
    console.error('🚨 [SECURITY WARNING] Default database credentials detected in production environment! Database initialization blocked.');
    throw new Error('Production Security Block: Default DB credentials or localhost db configurations cannot be used in production.');
  }
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbHost,
  port: dbPort,
  username: dbUser,
  password: dbPassword,
  database: dbName,
  synchronize: !isProduction, // Set to false in production
  logging: isProduction ? ['error', 'warn'] : false,
  entities: [CrimeIncident, AuditLog, PredictionRecord, ModelMetadataRecord, AlertRecord],
  migrations: [path.join(__dirname, '../migrations/*.ts')],
  subscribers: [],
});
