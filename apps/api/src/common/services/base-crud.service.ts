import { NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOptionsOrder, FindOptionsWhere, Repository } from 'typeorm';
import { BaseEntity } from '../entities/base.entity';

export interface ListOptions<T> {
  take?: number;
  skip?: number;
  order?: FindOptionsOrder<T>;
}

const MAX_PAGE_SIZE = 100;

export abstract class BaseCrudService<T extends BaseEntity> {
  constructor(protected readonly repository: Repository<T>) {}

  protected abstract ownerScope(userId: string): FindOptionsWhere<T>;

  findAllOwned(userId: string, options: ListOptions<T> = {}): Promise<T[]> {
    return this.repository.find({
      where: this.ownerScope(userId),
      order: options.order ?? ({ createdAt: 'DESC' } as FindOptionsOrder<T>),
      take: Math.min(options.take ?? 50, MAX_PAGE_SIZE),
      skip: options.skip ?? 0,
    });
  }

  async findOwned(userId: string, id: string, { withDeleted = false } = {}): Promise<T> {
    const entity = await this.repository.findOne({
      where: { ...this.ownerScope(userId), id } as FindOptionsWhere<T>,
      withDeleted,
    });
    if (!entity) throw new NotFoundException('Registro não encontrado');
    return entity;
  }

  async updateOwned(userId: string, id: string, data: DeepPartial<T>): Promise<T> {
    const entity = await this.findOwned(userId, id);
    this.repository.merge(entity, data);
    return this.repository.save(entity);
  }

  async removeOwned(userId: string, id: string): Promise<void> {
    const entity = await this.findOwned(userId, id);
    await this.repository.softRemove(entity);
  }

  async restoreOwned(userId: string, id: string): Promise<T> {
    const entity = await this.findOwned(userId, id, { withDeleted: true });
    if (entity.deletedAt) await this.repository.recover(entity);
    return entity;
  }
}
