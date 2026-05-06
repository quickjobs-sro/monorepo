import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeHelp,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  LayoutDashboard,
  MessageSquareMore,
  Shield,
  Users,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

export type NavigationItem = {
  description: string;
  href?: string;
  icon: LucideIcon;
  label: string;
  disabled?: boolean;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: "Operations",
    items: [
      {
        label: "Dashboard",
        href: ROUTES.dashboard,
        description: "Operativní přehled dnešní situace",
        icon: LayoutDashboard,
      },
      {
        label: "Feedback",
        href: ROUTES.feedback,
        description: "Poslední zpětná vazba z admin endpointu",
        icon: MessageSquareMore,
      },
      {
        label: "Jobs Overview",
        href: ROUTES.jobs,
        description: "Read-only přehled veřejných pracovních nabídek",
        icon: BriefcaseBusiness,
      },
      {
        label: "System Health",
        href: ROUTES.systemHealth,
        description: "Dostupnost backendu a session vrstva",
        icon: Activity,
      },
    ],
  },
  {
    label: "Reference Data",
    items: [
      {
        label: "Companies",
        href: ROUTES.companies,
        description: "Kontrola firem a jejich obsahu",
        icon: Building2,
      },
      {
        label: "Schools",
        href: ROUTES.schools,
        description: "Přehled škol a fakult",
        icon: GraduationCap,
      },
      {
        label: "Faculties",
        href: ROUTES.faculties,
        description: "Výslovně school-scoped pohled na fakulty",
        icon: BadgeHelp,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        label: "My Account",
        href: ROUTES.account,
        description: "Profil admin uživatele a změna hesla",
        icon: Shield,
      },
    ],
  },
];

export const comingSoonNavigation: NavigationItem[] = [
  {
    label: "Users",
    description: "Backend parity ještě není připravená",
    icon: Users,
    disabled: true,
  },
  {
    label: "Reviews",
    description: "Čeká na admin-ready read model",
    icon: MessageSquareMore,
    disabled: true,
  },
  {
    label: "Admin Stats",
    description: "Agregace přijdou až v další vlně",
    icon: LayoutDashboard,
    disabled: true,
  },
  {
    label: "Moderation",
    description: "CRUD a mutace zůstanou mimo v1",
    icon: Shield,
    disabled: true,
  },
];
