const ICONS = {
  house: "home",
  dashboard: "space_dashboard",
  receipt: "receipt",
  "receipt-text": "receipt_long",
  tire: "tire_repair",
  bell: "notifications",
  gauge: "speed",
  eye: "visibility",
  "eye-off": "visibility_off",
  search: "search",
  plus: "add",
  minus: "remove",
  fuel: "local_gas_station",
  wrench: "build",
  cog: "settings",
  "file-text": "description",
  "triangle-alert": "warning",
  shield: "shield",
  tag: "sell",
  gavel: "gavel",
  oil: "oil_barrel",
  left: "chevron_left",
  right: "chevron_right",
  check: "check",
  sms: "sms",
  camera: "photo_camera",
  clip: "attach_file",
  updown: "unfold_more",
  x: "close",
  chart: "bar_chart",
  droplet: "water_drop",
  download: "ios_share",
  card: "badge",
  sun: "light_mode",
  moon: "dark_mode",
  phone: "call",
  truck: "local_shipping",
  road: "route",
  car: "directions_car",
  asterisk: "emergency",
  rotate: "cached",
  compress: "compress",
  pencil: "edit",
  key: "key",
  "circle-plus": "add_circle",
  "circle-check": "check_circle",
  circle: "radio_button_unchecked",
  "mail-check": "mark_email_read",
  sheet: "table_view",
  pdf: "picture_as_pdf",
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <span aria-hidden translate="no" className={`material-symbol ${className ?? "block flex-none"}`} style={{ fontSize: size, width: size, height: size }}>
      {ICONS[name]}
    </span>
  );
}
