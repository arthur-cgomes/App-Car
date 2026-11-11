import { fileUrl } from "@/lib/api/expenses";

export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export function Avatar({ name, fileId, size }: { name: string; fileId: string | null; size: number }) {
  if (fileId) {
    return (
      <span
        role="img"
        aria-label="Foto de perfil"
        className="block rounded-full bg-cover bg-center bg-no-repeat"
        style={{ width: size, height: size, backgroundImage: `url("${fileUrl(fileId)}")` }}
      />
    );
  }
  return (
    <span
      className="grid place-items-center rounded-full bg-accent font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name)}
    </span>
  );
}
