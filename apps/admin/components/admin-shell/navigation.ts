import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BadgeHelp,
  BriefcaseBusiness,
  Building2,
  GraduationCap,
  Handshake,
  LayoutDashboard,
  MessageSquareMore,
  Rss,
  Search,
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
        label: "Customer Success",
        href: ROUTES.customerSuccess,
        description: "Firmy v riziku a slabé joby k zásahu",
        icon: Handshake,
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
        description: "Canonical stats a job detail audit",
        icon: BriefcaseBusiness,
      },
      {
        label: "External Jobs",
        href: ROUTES.externalJobs,
        description: "QA pohled na externí feedy",
        icon: Rss,
      },
      {
        label: "Candidates",
        href: ROUTES.candidates,
        description: "Filtrovaný support search kandidátů",
        icon: Search,
      },
      {
        label: "Users",
        href: ROUTES.users,
        description: "Admin správa userů a company vazeb",
        icon: Users,
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
