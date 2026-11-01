import { useQuery } from "@tanstack/react-query";
import { api } from "./client";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

export interface Me extends SessionUser {
  cpf: string | null;
  phone: string | null;
  phoneVerifiedAt: string | null;
  theme: "DARK" | "LIGHT";
  smsLoginEnabled: boolean;
  activeVehicleId: string | null;
  avatarFileId: string | null;
}

export interface CodeSent {
  maskedPhone: string;
  resendIn: number;
}

export const authApi = {
  login: (login: string, password: string) => api<{ user: SessionUser }>("/auth/login", { body: { login, password } }),
  requestPin: (plate: string) => api<CodeSent>("/auth/pin/request", { body: { plate } }),
  verifyPin: (plate: string, code: string) => api<{ user: SessionUser }>("/auth/pin/verify", { body: { plate, code } }),
  register: (body: { name: string; email: string; cpf?: string; phone: string; password: string; acceptTerms: boolean }) =>
    api<CodeSent & { user: SessionUser }>("/auth/register", { body }),
  sendPhoneCode: () => api<CodeSent>("/auth/phone/send", { method: "POST" }),
  verifyPhone: (code: string) => api<{ phoneVerified: true }>("/auth/phone/verify", { body: { code } }),
  forgotPassword: (login: string) => api<{ sent: true }>("/auth/password/forgot", { body: { login } }),
  resetPassword: (token: string, password: string) => api<{ changed: true }>("/auth/password/reset", { body: { token, password } }),
  logout: () => api<void>("/auth/logout", { method: "POST" }),
};

export const accountApi = {
  update: (body: Partial<Pick<Me, "name" | "email" | "cpf" | "avatarFileId" | "theme" | "smsLoginEnabled">>) =>
    api<Me>("/me", { method: "PATCH", body }),
  requestPhoneChange: (phone: string) => api<CodeSent>("/me/phone", { body: { phone } }),
  confirmPhoneChange: (code: string) => api<Me>("/me/phone/confirm", { body: { code } }),
  sendPasswordLink: () => api<{ sent: true }>("/me/password-link", { method: "POST" }),
  requestDeletion: () => api<{ method: "password" } | ({ method: "sms" } & CodeSent)>("/me/delete/request", { method: "POST" }),
  delete: (proof: { code?: string; password?: string }) => api<void>("/me", { method: "DELETE", body: proof }),
};

export const EXPORT_URL = "/api/v1/me/export";

export function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => api<Me>("/me"), staleTime: 60_000 });
}
