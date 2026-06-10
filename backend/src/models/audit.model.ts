import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', nullable: true })
  @Index('idx_audit_user_id')
  user_id?: string;

  @Column({ type: 'varchar' })
  @Index('idx_audit_action')
  action!: string;

  @Column({ type: 'varchar' })
  resource!: string;

  @Column({ type: 'jsonb', nullable: true })
  changes?: Record<string, any>;

  @Column({ type: 'varchar', nullable: true })
  ip_address?: string;

  @Column({ type: 'varchar', default: 'success' })
  status!: string;

  @CreateDateColumn()
  @Index('idx_audit_timestamp')
  timestamp!: Date;
}
