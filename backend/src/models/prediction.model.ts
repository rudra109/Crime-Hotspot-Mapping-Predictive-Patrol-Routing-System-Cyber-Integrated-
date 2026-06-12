import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('prediction_history')
export class PredictionRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn()
  @Index('idx_pred_timestamp')
  timestamp!: Date;

  @Column({ type: 'timestamp' })
  @Index('idx_pred_target_time')
  target_time!: Date;

  @Column({ type: 'text' })
  @Index('idx_pred_forecast_type')
  forecast_type!: string; // 'hourly' | 'daily' | 'weekly' | 'seasonal'

  @Column({ type: 'float' })
  predicted_value!: number;

  @Column({ type: 'float', nullable: true })
  actual_value?: number;

  @Column({ type: 'text', default: 'all' })
  region_or_zone!: string;

  @Column({ type: 'text' })
  model_version!: string;
}
