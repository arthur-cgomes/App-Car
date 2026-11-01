export function AppLogo({ subtitle = "O resumo do seu carro na palma da mão." }: { subtitle?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="flex size-[84px] flex-col items-center justify-center gap-1.5 rounded-[20px] bg-accent-800 shadow-[0_10px_24px_color-mix(in_srgb,var(--color-accent-900)_30%,transparent)]">
        <div className="flex w-14 flex-col overflow-hidden rounded-[5px] bg-white">
          <div className="h-[5px] bg-[var(--color-accent-500)]" />
          <div className="pb-px text-center" style={{ font: "600 17px/1.15 var(--font-barlow-condensed)", letterSpacing: ".06em", color: "var(--color-accent-900)" }}>
            CAR
          </div>
        </div>
      </div>
      <div>
        <div className="text-[28px] font-bold tracking-[-.02em]">App Car</div>
        <div className="text-[15px] text-ios-label2">{subtitle}</div>
      </div>
    </div>
  );
}
