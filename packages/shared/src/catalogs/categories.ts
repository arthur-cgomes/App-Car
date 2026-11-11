export const EXPENSE_CATEGORIES = [
  { code: 'FUEL', name: 'Combustível', icon: 'fuel', colorToken: '--cat-fuel', color: '#2f7cf6' },
  { code: 'MAINTENANCE', name: 'Manutenção', icon: 'wrench', colorToken: '--cat-maintenance', color: '#f59e0b' },
  { code: 'PARTS', name: 'Peças', icon: 'cog', colorToken: '--cat-parts', color: '#6d5ce8' },
  { code: 'TIRES', name: 'Pneus', icon: 'tire', colorToken: '--cat-tires', color: '#12a5b5' },
  { code: 'DOCUMENTS', name: 'Documentos', icon: 'file-text', colorToken: '--cat-documents', color: '#a855f7' },
  { code: 'FINES', name: 'Multas', icon: 'gavel', colorToken: '--cat-fines', color: '#ef4444' },
  { code: 'INSURANCE', name: 'Seguro', icon: 'shield', colorToken: '--cat-insurance', color: '#64748b' },
  { code: 'OTHER', name: 'Outros', icon: 'tag', colorToken: '--cat-other', color: '#8e8e93' },
] as const;

export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORIES)[number]['code'];
export type ExpenseCategoryInfo = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_BY_CODE = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.code, category]),
) as Record<ExpenseCategoryCode, ExpenseCategoryInfo>;

export const CATEGORIES_WITH_PART_SYSTEM: readonly ExpenseCategoryCode[] = ['PARTS', 'MAINTENANCE', 'TIRES'];

export const CATEGORIES_REQUIRING_PART_SYSTEM: readonly ExpenseCategoryCode[] = ['PARTS'];
