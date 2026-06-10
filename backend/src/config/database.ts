import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { CrimeIncident } from '../models/crime.model';
import { AuditLog } from '../models/audit.model';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'dev_password',
  database: process.env.DB_NAME || 'crime_hotspot',
  synchronize: true, // Set to false in production
  logging: false,
  entities: [CrimeIncident, AuditLog],
  migrations: [],
  subscribers: [],
});
