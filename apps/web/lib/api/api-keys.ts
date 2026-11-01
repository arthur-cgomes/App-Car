import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  createdAt: string;
}

const KEY = ["api-keys"] as const;

export function useApiKeys() {
  return useQuery({ queryKey: KEY, queryFn: () => api<ApiKey[]>("/me/api-keys") });
}

export function useCreateApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => api<ApiKey & { key: string }>("/me/api-keys", { body: { name } }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRevokeApiKey() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/me/api-keys/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: KEY }),
  });
}

export const FUEL_ENDPOINT = "/api/v1/integrations/fuel-expenses";
