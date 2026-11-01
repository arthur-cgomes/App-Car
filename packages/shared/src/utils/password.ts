export const PASSWORD_RULES_MESSAGE =
  'A senha precisa ter ao menos 8 caracteres, com 1 letra maiúscula, 1 número e 1 caractere especial.';

export const PASSWORD_HINT = 'Mínimo de 8 caracteres, com letra maiúscula, número e caractere especial.';

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 128 &&
    /\p{Lu}/u.test(password) &&
    /\d/.test(password) &&
    /[^\p{L}\d\s]/u.test(password)
  );
}
