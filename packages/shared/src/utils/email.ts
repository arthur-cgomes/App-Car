export type PinChannel = 'EMAIL' | 'SMS';

export const PIN_CHANNELS: readonly PinChannel[] = ['EMAIL', 'SMS'];

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2);
  return `${visible}${'•'.repeat(Math.max(3, Math.min(6, user.length - visible.length)))}@${domain}`;
}
