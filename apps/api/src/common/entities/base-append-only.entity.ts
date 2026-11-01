import { CreateDateColumn, PrimaryGeneratedColumn } from 'typeorm';

export abstract class BaseAppendOnlyEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
