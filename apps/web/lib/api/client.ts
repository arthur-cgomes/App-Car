export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

const BASE = "/api/v1";
const CSRF_HEADERS = { "X-Requested-With": "placar" };
const JSON_HEADERS = { ...CSRF_HEADERS, "Content-Type": "application/json" };
const INTERNAL_ERROR = "Erro interno no servidor.";
const GENERIC_ERROR = "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";

let refreshing: Promise<boolean> | null = null;

function refreshSession() {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST", headers: CSRF_HEADERS })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request(path: string, init: RequestInit) {
  try {
    const headers = init.body instanceof FormData ? CSRF_HEADERS : JSON_HEADERS;
    return await fetch(`${BASE}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, GENERIC_ERROR);
  }
}

export async function api<T>(path: string, options: { method?: string; body?: unknown } = {}): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? (options.body === undefined ? "GET" : "POST"),
    body:
      options.body === undefined
        ? undefined
        : options.body instanceof FormData
          ? options.body
          : JSON.stringify(options.body),
  };

  let response = await request(path, init);
  if (response.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      response = await request(path, init);
    } else {
      window.location.assign(new URL("/login", window.location.origin).href);
      throw new ApiError(401, "Sessão expirada. Entre novamente.");
    }
  }

  if (response.status === 204) return undefined as T;
  const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message = Array.isArray(body.message) ? body.message[0] : body.message;
    if (response.status >= 500 && (typeof message !== "string" || message === "Internal server error")) {
      throw new ApiError(response.status, INTERNAL_ERROR, body);
    }
    throw new ApiError(response.status, typeof message === "string" ? message : GENERIC_ERROR, body);
  }
  return body as T;
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : GENERIC_ERROR;
}
