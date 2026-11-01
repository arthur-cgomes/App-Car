import {
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChartColumn,
  Droplet,
  FileDown,
  IdCard,
  Cog,
  FileText,
  Fuel,
  House,
  MessageCircle,
  Paperclip,
  Phone,
  Plus,
  Receipt,
  Route,
  Search,
  Shield,
  Tag,
  TriangleAlert,
  Truck,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

const ICONS = {
  house: House,
  receipt: Receipt,
  bell: Bell,
  search: Search,
  plus: Plus,
  fuel: Fuel,
  wrench: Wrench,
  cog: Cog,
  "file-text": FileText,
  "triangle-alert": TriangleAlert,
  shield: Shield,
  tag: Tag,
  left: ChevronLeft,
  right: ChevronRight,
  check: Check,
  sms: MessageCircle,
  camera: Camera,
  clip: Paperclip,
  updown: ChevronsUpDown,
  x: X,
  chart: ChartColumn,
  droplet: Droplet,
  download: FileDown,
  card: IdCard,
  phone: Phone,
  truck: Truck,
  road: Route,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

interface IconProps {
  name: IconName;
  size?: number;
  stroke?: number;
  className?: string;
}

export function Icon({ name, size = 20, stroke = 1.75, className }: IconProps) {
  const Component = ICONS[name];
  return <Component aria-hidden width={size} height={size} strokeWidth={stroke} className={className ?? "block flex-none"} />;
}
