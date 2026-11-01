import { Table } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

const PG_IDENTIFIER_LIMIT = 63;

function tableNameOf(tableOrName: Table | string): string {
  const name = typeof tableOrName === 'string' ? tableOrName : tableOrName.name;
  return name.split('.').pop()!;
}

function constraintName(prefix: string, tableOrName: Table | string, columns: string[]): string {
  return [prefix, tableNameOf(tableOrName), ...columns].join('_').slice(0, PG_IDENTIFIER_LIMIT);
}

export class AppNamingStrategy extends SnakeNamingStrategy {
  primaryKeyName(tableOrName: Table | string): string {
    return constraintName('pk', tableOrName, []);
  }

  foreignKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return constraintName('fk', tableOrName, columnNames);
  }

  indexName(tableOrName: Table | string, columnNames: string[]): string {
    return constraintName('idx', tableOrName, columnNames);
  }

  uniqueConstraintName(tableOrName: Table | string, columnNames: string[]): string {
    return constraintName('uq', tableOrName, columnNames);
  }
}
