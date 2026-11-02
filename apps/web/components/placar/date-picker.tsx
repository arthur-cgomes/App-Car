"use client";

import { useEffect, useRef, useState } from "react";
import { cx } from "@/lib/cx";
import { MONTHS_LONG } from "@/lib/format";
import { useToday } from "@/lib/use-today";
import { Icon } from "./icon";

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const MONTHS_ABBR = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
const WHEEL_ITEM = 34;
const WHEEL_VISIBLE = 5;

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (year: number, month: number, day: number) => `${year}-${pad(month + 1)}-${pad(day)}`;
const daysIn = (year: number, month: number) => new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export function pillDate(value: string) {
  return `${+value.slice(8, 10)} de ${MONTHS_ABBR[+value.slice(5, 7) - 1]} de ${value.slice(0, 4)}`;
}

interface DatePickerCellProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  optional?: boolean;
  min?: string;
  max?: string;
}

export function DatePickerCell({ label, value, onChange, optional, min, max }: DatePickerCellProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b-[0.5px] border-ios-sep last:border-b-0">
      <div className="flex min-h-[46px] items-center gap-3 px-4">
        <span className="flex-1">{label}</span>
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${label}: ${value ? pillDate(value) : "sem data"}`}
          onClick={() => setOpen((current) => !current)}
          className={cx(
            "cursor-pointer rounded-[7px] border-0 bg-ios-fill px-[11px] py-[6px] text-[17px] tabular-nums transition-colors",
            open ? "text-ios-tint" : value ? "text-ios-label" : "text-ios-label3",
          )}
        >
          {value ? pillDate(value) : optional ? "Opcional" : "Escolher"}
        </button>
      </div>
      {open && (
        <div className="px-2 pb-2">
          <Calendar value={value} min={min} max={max} onChange={onChange} />
          {optional && value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="mx-auto mt-1 block cursor-pointer border-0 bg-transparent px-3 py-2 text-[15px] text-danger active:opacity-50"
            >
              Remover data
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Calendar({ value, onChange, min, max }: { value: string; onChange: (value: string) => void; min?: string; max?: string }) {
  const today = useToday() ?? "";
  const base = value || today || iso(new Date().getFullYear(), new Date().getMonth(), 1);
  const [view, setView] = useState({ year: +base.slice(0, 4), month: +base.slice(5, 7) - 1 });
  const [wheels, setWheels] = useState(false);

  const shift = (delta: number) =>
    setView(({ year, month }) => {
      const next = month + delta;
      return { year: year + Math.floor(next / 12), month: ((next % 12) + 12) % 12 };
    });

  const firstWeekday = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysIn(view.year, view.month) }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);

  const pick = (day: number) => {
    const next = iso(view.year, view.month, day);
    if ((min && next < min) || (max && next > max)) return;
    onChange(next);
  };

  const pickMonth = (year: number, month: number) => {
    setView({ year, month });
    if (value) onChange(iso(year, month, Math.min(+value.slice(8, 10), daysIn(year, month))));
  };

  return (
    <div className="select-none" role="group" aria-label="Calendário">
      <div className="flex items-center justify-between py-1.5 pr-1 pl-2">
        <button
          type="button"
          onClick={() => setWheels((current) => !current)}
          aria-expanded={wheels}
          className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-1 text-[17px] font-semibold text-ios-label active:opacity-50"
        >
          {MONTHS_LONG[view.month]} de {view.year}
          <Icon name="right" size={18} stroke={2.75} className={cx("block flex-none text-ios-tint transition-transform duration-300", wheels && "rotate-90")} />
        </button>
        {!wheels && (
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)} className="grid size-9 cursor-pointer place-items-center border-0 bg-transparent text-ios-tint active:opacity-40">
              <Icon name="left" size={22} stroke={2.5} />
            </button>
            <button type="button" aria-label="Próximo mês" onClick={() => shift(1)} className="grid size-9 cursor-pointer place-items-center border-0 bg-transparent text-ios-tint active:opacity-40">
              <Icon name="right" size={22} stroke={2.5} />
            </button>
          </div>
        )}
      </div>

      {wheels ? (
        <MonthYearWheels year={view.year} month={view.month} onChange={pickMonth} />
      ) : (
        <>
          <div className="grid grid-cols-7 pt-1 pb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[13px] font-semibold text-ios-label3">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, index) => {
              if (!day) return <div key={`blank-${index}`} className="h-11" />;
              const date = iso(view.year, view.month, day);
              const selected = date === value;
              const isToday = date === today;
              const disabled = (!!min && date < min) || (!!max && date > max);
              return (
                <div key={date} className="grid h-11 place-items-center">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={selected}
                    aria-label={pillDate(date)}
                    onClick={() => pick(day)}
                    className={cx(
                      "grid size-[42px] cursor-pointer place-items-center rounded-full border-0 text-[20px] tabular-nums transition-colors disabled:cursor-default disabled:opacity-30",
                      selected && isToday && "bg-ios-tint font-semibold text-white",
                      selected && !isToday && "bg-[color-mix(in_srgb,var(--color-ios-tint)_18%,transparent)] font-semibold text-ios-tint",
                      !selected && isToday && "bg-transparent text-ios-tint",
                      !selected && !isToday && "bg-transparent text-ios-label",
                    )}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function MonthYearWheels({ year, month, onChange }: { year: number; month: number; onChange: (year: number, month: number) => void }) {
  const current = new Date().getFullYear();
  const years = Array.from({ length: current + 11 - 1950 }, (_, i) => 1950 + i);
  return (
    <div className="relative flex h-[170px] justify-center gap-2 px-6">
      <div aria-hidden className="pointer-events-none absolute inset-x-3 top-1/2 h-[34px] -translate-y-1/2 rounded-full bg-ios-fill" />
      <Wheel label="Mês" items={MONTHS_LONG} index={month} onChange={(next) => onChange(year, next)} align="right" />
      <Wheel label="Ano" items={years.map(String)} index={years.indexOf(year)} onChange={(next) => onChange(years[next], month)} align="left" />
    </div>
  );
}

function Wheel({ label, items, index, onChange, align }: { label: string; items: string[]; index: number; onChange: (index: number) => void; align: "left" | "right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [active, setActive] = useState(index);
  const [initialIndex] = useState(index);

  useEffect(() => {
    ref.current?.scrollTo({ top: initialIndex * WHEEL_ITEM });
  }, [initialIndex]);
  useEffect(() => () => clearTimeout(settle.current), []);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      onScroll={(event) => {
        const next = Math.max(0, Math.min(items.length - 1, Math.round(event.currentTarget.scrollTop / WHEEL_ITEM)));
        setActive(next);
        clearTimeout(settle.current);
        settle.current = setTimeout(() => next !== index && onChange(next), 120);
      }}
      className="no-scrollbar relative z-[1] h-full flex-1 snap-y snap-mandatory overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent,#000_30%,#000_70%,transparent)]"
      style={{ paddingBlock: ((WHEEL_VISIBLE - 1) / 2) * WHEEL_ITEM }}
    >
      {items.map((item, i) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={i === active}
          onClick={() => ref.current?.scrollTo({ top: i * WHEEL_ITEM, behavior: "smooth" })}
          className={cx(
            "block w-full cursor-pointer snap-center border-0 bg-transparent px-3 text-[21px] transition-colors",
            align === "right" ? "text-right" : "text-left",
            i === active ? "text-ios-label" : "text-ios-label2",
          )}
          style={{ height: WHEEL_ITEM }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
