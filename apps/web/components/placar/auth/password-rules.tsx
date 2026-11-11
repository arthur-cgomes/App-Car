import { cx } from "@/lib/cx";
import { Icon } from "../icon";

const RULES: [string, (password: string) => boolean][] = [
  ["8 ou mais caracteres", (password) => password.length >= 8],
  ["Uma letra maiúscula", (password) => /[A-Z]/.test(password)],
  ["Um número", (password) => /\d/.test(password)],
  ["Um caractere especial", (password) => /[^A-Za-z0-9]/.test(password)],
];

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0 px-4">
      {RULES.map(([label, passes]) => {
        const ok = passes(password);
        return (
          <li key={label} className={cx("flex items-center gap-2 text-sm", ok ? "text-green" : "text-ios-label2")}>
            <Icon name={ok ? "circle-check" : "circle"} size={18} />
            {label}
          </li>
        );
      })}
    </ul>
  );
}
