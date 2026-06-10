import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum CrimeType {
  THEFT = 'theft',
  ASSAULT = 'assault',
  CYBERCRIME = 'cybercrime',
  TRAFFIC = 'traffic',
  BURGLARY = 'burglary',
  FRAUD = 'fraud'
}

@Entity('crime_incidents')
export class CrimeIncident {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: CrimeType,
    default: CrimeType.THEFT
  })
  @Index('idx_crime_type')
  type!: CrimeType;

  @Column({ type: 'int', default: 5 })
  severity!: number;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true
  })
  @Index('idx_crime_location', { spatial: true })
  location!: any;

  @Column({ type: 'text', nullable: true })
  location_address?: string;

  @CreateDateColumn()
  @Index('idx_crime_timestamp')
  timestamp!: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
