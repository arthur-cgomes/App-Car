import { describe, expect, it } from "vitest";
import { pillDate } from "@/components/placar/date-picker";
import { telHref } from "@/lib/api/contacts";

describe("seletor de data do iOS", () => {
  it("mostra a data como a pílula do iOS em pt-BR", () => {
    expect(pillDate("2026-11-01")).toBe("1 de nov. de 2026");
    expect(pillDate("2021-03-15")).toBe("15 de mar. de 2021");
  });
});

describe("contatos de emergência", () => {
  it("monta o link de discagem só com dígitos (e o + internacional)", () => {
    expect(telHref("0800 727 0800")).toBe("tel:08007270800");
    expect(telHref("(11) 3003-9303")).toBe("tel:1130039303");
    expect(telHref(" +55 21 99999-0001")).toBe("tel:+5521999990001");
  });
});
