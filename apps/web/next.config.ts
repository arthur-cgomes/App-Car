import path from "node:path";
import type { NextConfig } from "next";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/:path*` }];
  },
  async redirects() {
    return [
      ["/entrar", "/login"],
      ["/criar-conta", "/signup"],
      ["/esqueci-senha", "/forgot-password"],
      ["/nova-senha", "/reset-password"],
      ["/gastos", "/expenses"],
      ["/lembretes", "/reminders"],
      ["/consulta", "/lookup"],
      ["/perfil/integracoes", "/profile/integrations"],
      ["/perfil", "/profile"],
      ["/veiculo/abastecimentos", "/vehicle/fuel"],
      ["/veiculo/contatos", "/vehicle/contacts"],
      ["/veiculo/documentos", "/vehicle/documents"],
      ["/veiculo/relatorios", "/vehicle/reports"],
      ["/veiculo/seguros", "/vehicle/insurances"],
      ["/veiculo", "/vehicle"],
    ].map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
