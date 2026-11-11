"use client";

import { Icon } from "../icon";

const MAX_PER_PICK = 6;

export function AddPhotoButton({ onAdd }: { onAdd: (files: File[]) => void }) {
  return (
    <label className="flex size-20 flex-none cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-ios-label3 bg-ios-cell text-[11px] font-semibold text-ios-tint active:opacity-60">
      <Icon name="camera" size={26} />
      Adicionar
      <input
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const input = event.currentTarget;
          const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith("image/")).slice(0, MAX_PER_PICK);
          input.value = "";
          if (files.length) onAdd(files);
        }}
      />
    </label>
  );
}

export function PhotoThumb({ src, label, onClick }: { src: string; label: string; onClick?: () => void }) {
  const image = (
    <span role="img" aria-label={label} className="block size-20 rounded-xl bg-cover bg-center bg-no-repeat" style={{ backgroundImage: `url("${src}")` }} />
  );
  if (!onClick) return image;
  return (
    <button type="button" aria-label="Ver nota" onClick={onClick} className="size-20 flex-none cursor-pointer overflow-hidden rounded-xl border-0 p-0 transition-transform duration-150 active:scale-95">
      {image}
    </button>
  );
}
