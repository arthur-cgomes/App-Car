import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../../app.module';
import { ExpenseCategory } from '../../modules/expenses/expense-category.entity';
import { DEMO_ACCOUNT, seedDemoAccount } from './demo-account.seed';
import { seedExpenseCategories } from './expense-categories.seed';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  try {
    const created = await seedExpenseCategories(app.get(DataSource).getRepository(ExpenseCategory));
    console.log(`Seed concluído: ${created} categoria(s) criada(s) ou atualizada(s).`);
    if (process.env.NODE_ENV === 'production') return;
    await seedDemoAccount(app);
    console.log(`Conta de demonstração: ${DEMO_ACCOUNT.email} (carro padrão RIO2A18).`);
  } finally {
    await app.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
