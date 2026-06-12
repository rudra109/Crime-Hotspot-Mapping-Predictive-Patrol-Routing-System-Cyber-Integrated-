import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('model_metadata')
export class ModelMetadataRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  model_name!: string;

  @Column({ type: 'text' })
  version!: string;

  @CreateDateColumn()
  trained_at!: Date;

  @Column({ type: 'text' }) // Stringified JSON
  evaluation_metrics!: string;

  @Column({ type: 'text' })
  drift_status!: string;

  @Column({ type: 'text' }) // Stringified JSON
  drift_metrics!: string;

  @Column({ type: 'boolean', default: true })
  is_active!: boolean;
}
