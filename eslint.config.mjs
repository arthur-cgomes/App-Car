import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const USER_ID_MESSAGE =
  'Nunca receba id de usuário pela requisição. Use @CurrentUser() para obter o usuário do token.';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/.next/**', '**/node_modules/**', 'apps/web/**', '**/*.js', '**/*.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/api/**/*.ts', 'packages/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Decorator CallExpression[callee.name=/^(Param|Query|Body|Headers)$/] > Literal[value=/^(userId|ownerId|user_id|owner_id)$/i]',
          message: USER_ID_MESSAGE,
        },
        {
          selector:
            'Decorator CallExpression[callee.name=/^(Controller|Get|Post|Put|Patch|Delete|All)$/] > Literal[value=/:(userId|ownerId)\\b/i]',
          message: USER_ID_MESSAGE,
        },
      ],
    },
  },
  {
    files: ['apps/api/src/**/*.dto.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        { selector: 'PropertyDefinition[key.name=/^(userId|ownerId)$/]', message: USER_ID_MESSAGE },
      ],
    },
  },
);
