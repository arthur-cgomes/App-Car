"use client";

import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { accountApi, useMe, type Me } from "@/lib/api/auth";
import { errorMessage } from "@/lib/api/client";
import { useActivateVehicle, useActiveVehicle, vehicleName } from "@/lib/api/vehicles";
import { useDeleteExpense, type Expense } from "@/lib/api/expenses";
import { useDeleteReminder, useReminders, useSaveReminder, type Reminder } from "@/lib/api/reminders";
import { cx } from "@/lib/cx";
import { applyPrivacy } from "@/lib/privacy";
import { MAINTENANCE_REMINDER_MONTHS, maintenanceReminder, reminderOverdue } from "@/lib/reminder-format";
import { applyTheme, readTheme } from "@/lib/theme";
import { usePrivacy } from "@/lib/use-privacy";
import { useToday } from "@/lib/use-today";
import { Avatar } from "../avatar";
import { GlassIconButton } from "../buttons";
import { ExpenseDetail } from "../expense-detail";
import { Icon } from "../icon";
import { ActionPanel, ActionPanelButton, ActionPanelMessage, Backdrop, Banner, PhotoViewer } from "../overlays";
import { ExpenseSheet, type ExpenseFormValues } from "../sheets/expense-sheet";
import { OdometerSheet } from "../sheets/odometer-sheet";
import { ReminderSheet } from "../sheets/reminder-sheet";
import { VehicleSheet } from "../sheets/vehicle-sheet";
import { VehiclePicker } from "../vehicle-picker";
import { NavBar } from "./nav-bar";
import { ShellContext, type ConfirmAction, type ShellApi } from "./shell-context";
import { TABS, TabBar, type TabHref } from "./tab-bar";

type SheetRequest =
  | { mode: "expense"; prefill?: Partial<ExpenseFormValues>; expense?: Expense }
  | { mode: "reminder"; reminder?: Reminder }
  | { mode: "vehicle" }
  | { mode: "odometer" };
type SheetState = SheetRequest & { key: number };
type BannerState = { title: string; body: string; icon: string };

const COLLAPSE_AT = 44;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const deleteExpense = useDeleteExpense();
  const deleteReminder = useDeleteReminder();
  const saveReminder = useSaveReminder();
  const me = useMe();
  const queryClient = useQueryClient();
  const { vehicle, vehicles } = useActiveVehicle();
  const activate = useActivateVehicle();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const sheetKey = useRef(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [action, setAction] = useState<ConfirmAction | null>(null);
  const [lastAction, setLastAction] = useState<ConfirmAction | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [lastBanner, setLastBanner] = useState<BannerState | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [lastDetailId, setLastDetailId] = useState<string | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const [reminderOffer, setReminderOffer] = useState<Expense | null>(null);
  const [lastReminderOffer, setLastReminderOffer] = useState<Expense | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const activeTab = (TABS.find((tab) => tab.href !== "/" && pathname.startsWith(tab.href))?.href ?? "/") as TabHref;
  const title = TABS.find((tab) => tab.href === activeTab)!.title;
  const isTabRoot = TABS.some((tab) => tab.href === pathname);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const accountTheme = me.data?.theme === "LIGHT" ? "light" : me.data ? "dark" : null;
  useEffect(() => {
    if (accountTheme && accountTheme !== readTheme()) applyTheme(accountTheme);
  }, [accountTheme]);

  const toggleTheme = () => {
    const next = accountTheme === "light" ? "DARK" : "LIGHT";
    applyTheme(next === "LIGHT" ? "light" : "dark");
    queryClient.setQueryData<Me>(["me"], (current) => current && { ...current, theme: next });
    accountApi.update({ theme: next }).catch((failure) => toast(errorMessage(failure)));
  };

  const hidden = usePrivacy();
  const today = useToday();
  const reminders = useReminders(vehicle?.id);
  const overdue =
    today && reminders.data ? reminders.data.items.filter((reminder) => reminderOverdue(reminder, today, reminders.data.odometer)) : [];
  const togglePrivacy = () => {
    applyPrivacy(!hidden);
  };

  const toast = useCallback((message: string) => {
    const next = { title: "App Car", body: message, icon: "A" };
    setBanner(next);
    setLastBanner(next);
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 2600);
  }, []);

  useEffect(() => () => clearTimeout(bannerTimer.current), []);

  const openSheet = useCallback((next: SheetRequest) => {
    setPickerOpen(false);
    sheetKey.current = Date.now();
    setSheet({ ...next, key: sheetKey.current });
    setSheetOpen(true);
  }, []);

  const api = useMemo<ShellApi>(
    () => ({
      openExpenseSheet: (prefill) => {
        if (vehicle) return openSheet({ mode: "expense", prefill });
        openSheet({ mode: "vehicle" });
        toast("Adicione um veículo para lançar gastos.");
      },
      openVehicleSheet: () => openSheet({ mode: "vehicle" }),
      openReminderSheet: (reminder) => openSheet({ mode: "reminder", reminder }),
      openVehiclePicker: () => setPickerOpen(true),
      openExpenseDetail: (id) => {
        setDetailId(id);
        setLastDetailId(id);
      },
      confirm: (next) => {
        setAction(next);
        setLastAction(next);
      },
      toast,
    }),
    [openSheet, toast, vehicle],
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("add") !== "vehicle") return;
    router.replace("/");
    api.openVehicleSheet();
  }, [api, router]);

  const shownBanner = banner ?? lastBanner;
  const shownAction = action ?? lastAction;

  return (
    <ShellContext.Provider value={api}>
      <div className="app-frame overflow-clip bg-black">
        <div
          className={cx(
            "absolute inset-0 overflow-clip bg-ios-bg transition-[scale,translate,border-radius] duration-450 ease-ios",
            sheetOpen && "max-md:translate-y-3.5 max-md:scale-[.92] max-md:rounded-[38px]",
          )}
        >
          <div className="absolute inset-0 transition-transform duration-450 ease-ios" style={{ transform: detailId ? "translateX(-30%)" : "none" }}>
            <div
              ref={scrollRef}
              onScroll={(event) => {
                const next = event.currentTarget.scrollTop > COLLAPSE_AT;
                if (next !== collapsed) setCollapsed(next);
              }}
              className="no-scrollbar absolute inset-0 overflow-y-auto"
              style={{
                paddingTop: isTabRoot ? "calc(env(safe-area-inset-top) + 56px)" : 0,
                paddingBottom: "calc(var(--tabbar-bottom) + 96px)",
              }}
            >
              {isTabRoot ? <div className="mx-auto w-full max-w-[720px]">{children}</div> : children}
            </div>
            {isTabRoot && <NavBar
              title={title}
              collapsed={collapsed}
              leading={
                activeTab === "/" && (
                  <button
                    type="button"
                    aria-label="Perfil"
                    onClick={() => router.push("/profile")}
                    className="cursor-pointer rounded-full border-0 bg-transparent p-0 active:opacity-60"
                  >
                    {me.data && <Avatar name={me.data.name} fileId={me.data.avatarFileId} size={40} />}
                  </button>
                )
              }
              actions={
                activeTab === "/" ? (
                  <div className="glass-control flex h-10 items-center rounded-full px-1">
                    <button
                      type="button"
                      aria-label={hidden ? "Mostrar valores" : "Ocultar valores"}
                      aria-pressed={hidden}
                      onClick={togglePrivacy}
                      className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ios-label active:opacity-50"
                    >
                      <Icon name={hidden ? "eye-off" : "eye"} size={20} stroke={2} />
                    </button>
                    {vehicle && (
                      <button
                        type="button"
                        aria-label="Atualizar km do carro"
                        onClick={() => openSheet({ mode: "odometer" })}
                        className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ios-label active:opacity-50"
                      >
                        <Icon name="gauge" size={20} stroke={2} />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={accountTheme === "light" ? "Usar tema escuro" : "Usar tema claro"}
                      onClick={toggleTheme}
                      className="grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ios-label active:opacity-50"
                    >
                      <Icon name={accountTheme === "light" ? "moon" : "sun"} size={20} stroke={2} />
                    </button>
                    <button
                      type="button"
                      aria-label={overdue.length ? `Notificações: ${overdue.length} ${overdue.length === 1 ? "lembrete vencido" : "lembretes vencidos"}` : "Notificações"}
                      onClick={() => router.push("/reminders?filter=overdue")}
                      className="relative grid size-9 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-ios-label active:opacity-50"
                    >
                      <Icon name="bell" size={20} stroke={2} />
                      {overdue.length > 0 && <span aria-hidden className="absolute top-[7px] right-[8px] size-2 rounded-full bg-danger ring-2 ring-[var(--ios-glass)]" />}
                    </button>
                  </div>
                ) : activeTab === "/expenses" || activeTab === "/reminders" ? (
                  <GlassIconButton
                    aria-label={activeTab === "/expenses" ? "Novo gasto" : "Novo lembrete"}
                    onClick={() => (activeTab === "/expenses" ? api.openExpenseSheet() : vehicle && api.openReminderSheet())}
                  >
                    <Icon name="plus" />
                  </GlassIconButton>
                ) : null
              }
            />}
          </div>

          <ExpenseDetail
            open={!!detailId}
            vehicleId={vehicle?.id}
            expenseId={detailId ?? lastDetailId}
            onBack={() => setDetailId(null)}
            onViewPhoto={setViewer}
            onMessage={toast}
            onEdit={(expense) => openSheet({ mode: "expense", expense })}
            onDelete={(expense) =>
              api.confirm({
                message: "Este gasto será excluído permanentemente.",
                label: "Excluir gasto",
                onConfirm: () =>
                  deleteExpense.mutate(
                    { vehicleId: expense.vehicleId, id: expense.id },
                    {
                      onSuccess: () => {
                        setDetailId(null);
                        setTimeout(() => toast("Gasto excluído."), 400);
                      },
                      onError: (error) => toast(errorMessage(error)),
                    },
                  ),
              })
            }
          />

          <TabBar active={activeTab} onAdd={() => api.openExpenseSheet()} />
        </div>

        <Backdrop open={sheetOpen} onClose={() => setSheetOpen(false)} />
        {sheet?.mode === "expense" && vehicle && (
          <ExpenseSheet
            key={sheet.key}
            open={sheetOpen}
            vehicleId={vehicle.id}
            expense={sheet.expense}
            prefill={sheet.prefill}
            onCancel={() => setSheetOpen(false)}
            onSubmit={(saving) => {
              const key = sheet.key;
              setSheetOpen(false);
              saving
                .then((saved) => {
                  if (!sheet.expense && saved.category === "MAINTENANCE") {
                    setTimeout(() => {
                      setReminderOffer(saved);
                      setLastReminderOffer(saved);
                    }, 450);
                  }
                })
                .catch(() => {
                  if (sheetKey.current === key) {
                    toast("Não foi possível salvar o gasto. Confira e tente de novo.");
                    setSheetOpen(true);
                  } else {
                    toast("Não foi possível salvar o gasto. Tente de novo.");
                  }
                });
            }}
          />
        )}
        {sheet?.mode === "reminder" && vehicle && (
          <ReminderSheet
            key={sheet.key}
            open={sheetOpen}
            vehicleId={vehicle.id}
            reminder={sheet.reminder}
            onCancel={() => setSheetOpen(false)}
            onSaved={() => {
              setSheetOpen(false);
              setTimeout(() => toast(sheet.reminder ? "Lembrete atualizado." : "Lembrete criado."), 350);
            }}
            onDelete={(reminder) =>
              api.confirm({
                message: "Este lembrete será excluído.",
                label: "Excluir lembrete",
                onConfirm: () =>
                  deleteReminder.mutate(
                    { vehicleId: vehicle.id, id: reminder.id },
                    {
                      onSuccess: () => {
                        setSheetOpen(false);
                        setTimeout(() => toast("Lembrete excluído."), 350);
                      },
                      onError: (error) => toast(errorMessage(error)),
                    },
                  ),
              })
            }
          />
        )}
        {sheet?.mode === "odometer" && vehicle && (
          <OdometerSheet
            key={sheet.key}
            open={sheetOpen}
            vehicle={vehicle}
            onClose={() => setSheetOpen(false)}
            onSaved={(message) => {
              setSheetOpen(false);
              setTimeout(() => toast(message), 350);
            }}
          />
        )}
        {sheet?.mode === "vehicle" && (
          <VehicleSheet
            key={sheet.key}
            open={sheetOpen}
            lookupAvailable={me.data?.plateLookupAvailable ?? true}
            vehicles={vehicles}
            onCancel={() => setSheetOpen(false)}
            onAdded={(added) => {
              setSheetOpen(false);
              router.push("/");
              setTimeout(() => toast(`${vehicleName(added)} adicionado à sua conta.`), 350);
            }}
          />
        )}

        <Backdrop open={pickerOpen} onClose={() => setPickerOpen(false)} z={30} strength={35} />
        <VehiclePicker
          open={pickerOpen}
          vehicles={vehicles}
          activeId={vehicle?.id ?? ""}
          onPick={(id) => {
            setPickerOpen(false);
            setDetailId(null);
            scrollRef.current?.scrollTo({ top: 0 });
            if (id !== vehicle?.id) activate.mutate(id, { onError: (error) => toast(errorMessage(error)) });
          }}
          onAdd={() => api.openVehicleSheet()}
          onCancel={() => setPickerOpen(false)}
        />

        <Backdrop open={!!action} onClose={() => setAction(null)} z={30} />
        <ActionPanel open={!!action} onCancel={() => setAction(null)}>
          <ActionPanelMessage>{shownAction?.message}</ActionPanelMessage>
          <ActionPanelButton
            destructive
            onClick={() => {
              action?.onConfirm();
              setAction(null);
            }}
          >
            {shownAction?.label}
          </ActionPanelButton>
        </ActionPanel>

        <Backdrop open={!!reminderOffer} onClose={() => setReminderOffer(null)} z={30} />
        <ActionPanel open={!!reminderOffer} onCancel={() => setReminderOffer(null)} cancelLabel="Agora não">
          <ActionPanelMessage>
            <strong className="block text-[13px] font-semibold">Lembrar da próxima manutenção?</strong>
            {lastReminderOffer && `“${maintenanceReminder(lastReminderOffer, 3).title}” vai aparecer em Lembretes.`}
          </ActionPanelMessage>
          {MAINTENANCE_REMINDER_MONTHS.map((months) => (
            <ActionPanelButton
              key={months}
              onClick={() => {
                const expense = reminderOffer;
                setReminderOffer(null);
                if (!expense) return;
                const input = maintenanceReminder(expense, months);
                saveReminder.mutate(
                  { vehicleId: expense.vehicleId, input },
                  {
                    onSuccess: () => toast(`Lembrete criado para ${input.dueDate!.split("-").reverse().join("/")}.`),
                    onError: (error) => toast(errorMessage(error)),
                  },
                );
              }}
            >
              Daqui a {months} meses
            </ActionPanelButton>
          ))}
        </ActionPanel>

        <PhotoViewer src={viewer} onClose={() => setViewer(null)} />
        <Banner banner={shownBanner} open={!!banner} onTap={() => setBanner(null)} />
      </div>
    </ShellContext.Provider>
  );
}
