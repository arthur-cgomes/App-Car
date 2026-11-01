export const EXPENSE_CATEGORIES = [
  { code: 'FUEL', name: 'Combustível', icon: 'fuel', colorToken: '--color-accent-800', color: '#023379' },
  { code: 'MAINTENANCE', name: 'Manutenção', icon: 'wrench', colorToken: '--color-accent-600', color: '#346cc4' },
  { code: 'PARTS', name: 'Peças', icon: 'cog', colorToken: '--color-accent-700', color: '#164ea3' },
  { code: 'DOCUMENTS', name: 'Documentos', icon: 'file-text', colorToken: '--color-accent-500', color: '#5d8fde' },
  { code: 'FINES', name: 'Multas e débitos', icon: 'triangle-alert', colorToken: '--color-accent-400', color: '#8bb2f1' },
  { code: 'INSURANCE', name: 'Seguro', icon: 'shield', colorToken: '--color-neutral-700', color: '#5d5d60' },
  { code: 'OTHER', name: 'Outros', icon: 'tag', colorToken: '--color-neutral-500', color: '#98989b' },
] as const;

export type ExpenseCategoryCode = (typeof EXPENSE_CATEGORIES)[number]['code'];
export type ExpenseCategoryInfo = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_BY_CODE = Object.fromEntries(
  EXPENSE_CATEGORIES.map((category) => [category.code, category]),
) as Record<ExpenseCategoryCode, ExpenseCategoryInfo>;

export const CATEGORIES_WITH_PART_SYSTEM: readonly ExpenseCategoryCode[] = ['PARTS', 'MAINTENANCE'];

export const CATEGORIES_REQUIRING_PART_SYSTEM: readonly ExpenseCategoryCode[] = ['PARTS'];
