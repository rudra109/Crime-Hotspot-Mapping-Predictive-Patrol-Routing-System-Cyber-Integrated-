import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('alert_records')
export class AlertRecord {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  type!: 'Critical' | 'Warning' | 'Info';

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 100 })
  sector!: string;

  @Column({ type: 'varchar', length: 50, default: 'Pending' })
  status!: 'Pending' | 'Acknowledged' | 'Dispatched' | 'Escalated';

  @Column({ type: 'varchar', length: 100, nullable: true })
  incidentId?: string | null;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'int', default: 1 })
  escalationLevel!: number; // 1 | 2 | 3

  @Column({ type: 'varchar', length: 50, default: 'general_dispatch' })
  routeCategory!: 'cyber_cell' | 'traffic_control' | 'quick_response' | 'general_dispatch';

  @Column({ type: 'varchar', length: 100, nullable: true })
  operatorId?: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  operatorName?: string | null;

  @Column({ type: 'text', nullable: true })
  operatorNotes?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  acknowledgedAt?: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  escalatedAt?: Date | null;

  @Column({ type: 'varchar', length: 50, default: 'local' })
  source!: 'local' | 'erss_112';

  @Column({ type: 'text', default: '[]' })
  history!: string; // JSON string representation of history array [{event, timestamp, details}]
}
