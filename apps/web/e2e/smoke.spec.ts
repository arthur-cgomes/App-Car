import { expect, test, type Page } from "@playwright/test";

const random = (digits: number) => String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, "0");
const letters = (count: number) => Array.from({ length: count }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join("");

const PASSWORD = "Placar-e2e-2026!";

function randomCpf() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const check = (base: number[]) => {
    const sum = base.reduce((total, digit, index) => total + digit * (base.length + 1 - index), 0);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  digits.push(check(digits));
  digits.push(check(digits));
  return digits.join("");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("DOMContentLoaded", () => {
      const style = document.createElement("style");
      style.textContent = "nextjs-portal { display: none !important; }";
      document.head.append(style);
    });
  });
});

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";

async function codeSentTo(email: string) {
  for (let attempt = 0; attempt < 20; attempt++) {
    const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}&limit=1`);
    const { messages } = (await response.json()) as { messages: { Snippet: string }[] };
    const code = messages[0] && /\b(\d{6})\b/.exec(messages[0].Snippet)?.[1];
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Nenhum código no Mailpit para ${email}`);
}

async function signUp(page: Page, email: string) {
  await page.goto("/signup");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Enviar código" }).click();
  await expect(page.getByText("Confirme seu e-mail")).toBeVisible();
  await page.getByLabel("Código de 6 dígitos").fill(await codeSentTo(email));
  await page.getByRole("button", { name: "Confirmar" }).click();

  await expect(page.getByText("Seus dados")).toBeVisible();
  await page.getByLabel("Nome").fill("Pessoa E2E");
  await page.getByLabel("CPF").fill(randomCpf());
  await page.getByLabel("Celular").fill(`119${random(8)}`);
  await page.getByRole("button", { name: "Continuar" }).click();

  await page.getByLabel("Senha", { exact: true }).fill("fraca");
  await page.getByLabel("Confirmar").fill("fraca");
  await page.getByRole("switch", { name: /Aceitar os Termos/ }).click();
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText(/ao menos 8 caracteres/)).toBeVisible();

  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirmar").fill(PASSWORD);
  await page.getByRole("button", { name: "Criar conta" }).click();
  await expect(page.getByText("Seu carro")).toBeVisible();
}

test("cadastro, veículo, gasto, perfil e novo login", async ({ page }) => {
  const email = `e2e-${Date.now()}-${random(4)}@placar.local`;
  await signUp(page, email);

  await page.goto("/");
  const addVehicle = page.getByRole("button", { name: "Adicionar veículo" }).first();
  await expect(addVehicle).toBeInViewport();
  await addVehicle.click();
  const sheet = page.getByRole("dialog", { name: "Adicionar veículo" });
  await sheet.getByLabel("Placa do novo veículo").fill(`${letters(3)}${random(1)}${letters(1)}${random(2)}`);
  await sheet.getByRole("button", { name: "Buscar dados do veículo" }).click();
  await expect(sheet.getByText("Município")).toBeVisible();
  await sheet.getByRole("button", { name: "Adicionar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Trocar veículo" })).toBeVisible();

  await page.getByRole("button", { name: "Novo gasto" }).click();
  const expense = page.getByRole("dialog", { name: "Novo gasto" });
  await expense.getByLabel("Valor").fill("123,45");
  await expense.getByLabel("Descrição").fill("Abastecimento E2E");
  await expense.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Abastecimento E2E").first()).toBeVisible();

  await page.getByRole("link", { name: "Gastos" }).click();
  await expect(page.getByText("Abastecimento E2E").first()).toBeVisible();

  await page.getByRole("link", { name: "Resumo" }).click();
  await page.getByRole("button", { name: "Perfil" }).click();
  await expect(page.getByText(email).first()).toBeVisible();
  await page.getByRole("tab", { name: "Claro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.getByRole("button", { name: "Sair da conta" }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.waitForLoadState("networkidle");

  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("button", { name: "Trocar veículo" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("rotas do app exigem sessão", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});
