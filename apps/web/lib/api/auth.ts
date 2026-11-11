import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export type PinChannel = "EMAIL" | "SMS";

export interface Me extends SessionUser {
  cpf: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  emailVerifiedAt: string | null;
  theme: "DARK" | "LIGHT";
  pinLoginEnabled: boolean;
  pinChannel: PinChannel;
  smsAvailable: boolean;
  plateLookupAvailable: boolean;
  activeVehicleId: string | null;
  avatarFileId: string | null;
}

export interface CodeSent {
  channel: PinChannel;
  sentTo: string;
  resendIn: number;
}

export const sentVia = (sent: Pick<CodeSent, "channel" | "sentTo">) =>
  sent.channel === "SMS" ? `por SMS para ${sent.sentTo}` : `por e-mail para ${sent.sentTo}`;

export const authApi = {
  login: (login: string, password: string) => api<{ user: SessionUser }>("/auth/login", { body: { login, password } }),
  requestPin: (plate: string) => api<CodeSent>("/auth/pin/request", { body: { plate } }),
  verifyPin: (plate: string, code: string) => api<{ user: SessionUser }>("/auth/pin/verify", { body: { plate, code } }),
  signupStart: (email: string) => api<CodeSent>("/auth/signup/start", { body: { email } }),
  signupVerify: (email: string, code: string) => api<{ signupToken: string; expiresIn: number }>("/auth/signup/verify", { body: { email, code } }),
  register: (body: { signupToken: string; name: string; cpf: string; phone: string; password: string; acceptTerms: boolean }) =>
    api<{ user: SessionUser }>("/auth/register", { body }),
  sendEmailCode: () => api<CodeSent>("/auth/email/send", { method: "POST" }),
  verifyEmail: (code: string) => api<{ emailVerified: true }>("/auth/email/verify", { body: { code } }),
  sendPhoneCode: () => api<CodeSent>("/auth/phone/send", { method: "POST" }),
  verifyPhone: (code: string) => api<{ phoneVerified: true }>("/auth/phone/verify", { body: { code } }),
  forgotPassword: (login: string) => api<{ sent: true }>("/auth/password/forgot", { body: { login } }),
  resetPassword: (token: string, password: string) => api<{ changed: true }>("/auth/password/reset", { body: { token, password } }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
};

export const accountApi = {
  update: (body: Partial<Pick<Me, "name" | "email" | "cpf" | "avatarFileId" | "theme" | "pinLoginEnabled" | "pinChannel">>) =>
    api<Me>("/me", { method: "PATCH", body }),
  requestPhoneChange: (phone: string) => api<{ saved: true; user: Me } | ({ saved: false } & CodeSent)>("/me/phone", { body: { phone } }),
  confirmPhoneChange: (code: string) => api<Me>("/me/phone/confirm", { body: { code } }),
  changePassword: (currentPassword: string, password: string) => api<{ changed: true }>("/me/password", { body: { currentPassword, password } }),
  requestDeletion: () => api<{ method: "password" } | ({ method: "code" } & CodeSent)>("/me/delete/request", { method: "POST" }),
  delete: (proof: { code?: string; password?: string }) => api<void>("/me", { method: "DELETE", body: proof }),
};

export const EXPORT_URL = "/api/v1/me/export";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/me"), staleTime: 60_000 });
}
