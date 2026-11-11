"use client";

import { useState, type InputHTMLAttributes } from "react";
import { errorMessage } from "@/lib/api/client";
import { fileUrl, uploadFile } from "@/lib/api/expenses";
import { centsToMoneyInput } from "@/lib/format";

const CELL = "flex min-h-[45px] items-center gap-3 border-b-[0.5px] border-ios-sep px-4 last:border-b-0";

export function InputCell({ label, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={CELL}>
      <span className="flex-none text-[17px]">{label}</span>
      <input {...input} className="min-w-0 flex-1 border-0 bg-transparent text-right text-[17px] text-ios-label outline-0" />
    </label>
  );
}

export { DatePickerCell as DateCell } from "./date-picker";

export function AttachmentCell({ fileId, onChange, onError }: { fileId: string | null; onChange: (id: string | null) => void; onError: (message: string) => void }) {
  const [uploading, setUploading] = useState(false);
  if (fileId) {
    return (
      <div className={CELL}>
        <a href={fileUrl(fileId)} target="_blank" rel="noreferrer" className="flex-1 text-ios-tint no-underline active:opacity-50">
          Ver arquivo
        </a>
        <button type="button" onClick={() => onChange(null)} className="cursor-pointer border-0 bg-transparent text-[15px] text-danger active:opacity-50">
          Remover
        </button>
      </div>
    );
  }
  return (
    <label className={`${CELL} cursor-pointer text-ios-tint active:opacity-60`}>
      {uploading ? "Enviando…" : "Anexar arquivo"}
      <input
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        disabled={uploading}
        onChange={async (event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (!file) return;
          setUploading(true);
          try {
            onChange(await uploadFile(file));
          } catch (error) {
            onError(errorMessage(error));
          } finally {
            setUploading(false);
          }
        }}
      />
    </label>
  );
}

export const centsToInput = (cents: number | null) => (cents ? centsToMoneyInput(cents) : "");
export const brDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
