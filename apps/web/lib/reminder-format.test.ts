import { describe, expect, it } from "vitest";
import type { Reminder } from "@/lib/api/reminders";
import type { Expense } from "@/lib/api/expenses";
import { addMonths, maintenanceReminder, reminderDetail, reminderUrgent, reminderWhen } from "./reminder-format";

const reminder = (overrides: Partial<Reminder>): Reminder => ({
  id: "r",
  category: "FINES",
  title: "",
  source: "MANUAL",
  automatic: false,
  dueDate: null,
  dueOdometer: null,
  amountCents: null,
  repeatMonths: null,
  repeatKm: null,
  doneAt: null,
  ...overrides,
});

describe("textos dos lembretes (iguais ao design)", () => {
  const today = "2026-10-31";

  it("débito em aberto", () => {
    const fine = reminder({ source: "AUTO_DEBT", amountCents: 13016, dueDate: "2026-11-10" });
    expect(reminderDetail(fine, 0).replace(/\s/g, " ")).toBe("R$ 130,16 · vence 10/11");
    expect(reminderWhen(fine, today, 0, null)).toBe("Em 10 dias");
    expect(reminderUrgent(fine, today, 0)).toBe(true);
  });

  it("revisão por km com média de km/dia", () => {
    const service = reminder({ source: "AUTO_SERVICE", dueOdometer: 40000 });
    expect(reminderDetail(service, 38420)).toBe("Faltam 1.580 km");
    expect(reminderWhen(service, today, 38420, 37)).toBe("~6 semanas");
    expect(reminderWhen(service, today, 38420, null)).toBe("");
  });

  it("estimativa de IPVA e prazos em meses", () => {
    const ipva = reminder({ source: "AUTO_IPVA", amountCents: 214000, dueDate: "2027-01-31" });
    expect(reminderDetail(ipva, 0).replace(/\s/g, " ")).toBe("Estimativa R$ 2.140,00 · jan/2027");
    expect(reminderWhen(ipva, today, 0, null)).toBe("Em 3 meses");
    expect(reminderWhen(reminder({ dueDate: "2027-03-05" }), today, 0, null)).toBe("Em 4 meses");
  });

  it("concluídos e vencidos", () => {
    expect(reminderDetail(reminder({ source: "AUTO_DEBT", doneAt: "2026-09-20T12:00:00Z" }), 0)).toBe("Pago em 20/09");
    expect(reminderWhen(reminder({ doneAt: "2026-09-20T12:00:00Z" }), today, 0, null)).toBe("Concluído");
    expect(reminderWhen(reminder({ dueDate: "2026-10-28" }), today, 0, null)).toBe("Venceu há 3 dias");
  });
});

describe("lembrete oferecido depois de uma manutenção", () => {
  const expense = (overrides: Partial<Expense>) =>
    ({ category: "MAINTENANCE", description: "Manutenção", partSystem: null, date: "2026-11-01", ...overrides }) as Expense;

  it("soma meses e cai no último dia dos meses curtos", () => {
    expect(addMonths("2026-11-01", 3)).toBe("2027-02-01");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonths("2027-12-15", 12)).toBe("2028-12-15");
  });

  it("usa a descrição, o sistema da peça ou um título padrão", () => {
    expect(maintenanceReminder(expense({ description: "Troca de óleo" }), 6)).toEqual({
      title: "Troca de óleo",
      category: "MAINTENANCE",
      dueDate: "2027-05-01",
      dueOdometer: null,
      repeatMonths: null,
      repeatKm: null,
    });
    expect(maintenanceReminder(expense({ partSystem: "BRAKES" }), 3).title).toBe("Manutenção: Freios");
    expect(maintenanceReminder(expense({}), 12)).toMatchObject({ title: "Próxima manutenção", dueDate: "2027-11-01" });
  });
});
