import { describe, expect, it } from "vitest";
import { centsToMoneyInput, formatLitersInput, formatMoneyInput, parseLitersInput, parseMoneyInput } from "./format";

describe("campos de valor", () => {
  it("a vírgula anda conforme os dígitos são digitados", () => {
    expect(formatMoneyInput("1")).toBe("0,01");
    expect(formatMoneyInput("100")).toBe("1,00");
    expect(formatMoneyInput("10000")).toBe("100,00");
    expect(formatMoneyInput("1234567")).toBe("12.345,67");
    expect(formatMoneyInput("12.345,678")).toBe("123.456,78");
    expect(formatMoneyInput("0,0")).toBe("");
    expect(formatMoneyInput("abc")).toBe("");
  });

  it("litros com três casas: a vírgula anda conforme digita", () => {
    expect(formatLitersInput("37145")).toBe("37,145");
    expect(formatLitersInput("5")).toBe("0,005");
    expect(formatLitersInput("1234567")).toBe("1.234,567");
    expect(parseLitersInput("37,145")).toBe(37.145);
    expect(parseLitersInput("")).toBeNull();
  });

  it("volta para centavos sem perder nada", () => {
    expect(parseMoneyInput(formatMoneyInput("1234567"))).toBe(1234567);
    expect(centsToMoneyInput(793260)).toBe("7.932,60");
  });
});
