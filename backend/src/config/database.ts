import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';
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

/**
 * Ensures the target database exists. If not, connects to the default 'postgres' database
 * and creates the target database automatically.
 */
export async function ensureDatabaseExists(): Promise<void> {
  const client = new Client({
    host: dbHost,
    port: dbPort,
    user: dbUser,
    password: dbPassword,
    database: 'postgres', // Connect to default database first
  });

  try {
    await client.connect();

    // Check if our target database exists
    const result = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (result.rowCount === 0) {
      console.log(`📦 Database "${dbName}" not found. Creating it now...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`✅ Database "${dbName}" already exists.`);
    }
  } catch (error: any) {
    // If PostgreSQL is not reachable at all, we'll handle it gracefully
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.warn(`⚠️  PostgreSQL not reachable at ${dbHost}:${dbPort}. Will run without database.`);
    } else {
      console.error('⚠️  Error checking/creating database:', error.message);
    }
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore close errors
    }
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
