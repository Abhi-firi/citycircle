import {
  Building2,
  CodeXml,
  HandCoins,
  House,
  Landmark,
  LayoutDashboard,
  Rocket,
  Sparkles,
  TrendingUp,
  UserSearch,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  "angel-investors": HandCoins,
  vc: Landmark,
  "startup-founders": Rocket,
  coders: CodeXml,
  "product-managers": LayoutDashboard,
  "recruiters-hr": UserSearch,
  "sales-business-development": TrendingUp,
  "creators-influencers": Sparkles,
  "residential-real-estate-builders": House,
  "commercial-real-estate-builders": Building2,
};

export function hasDomainIcon(slug: string): boolean {
  return slug in ICONS;
}

export function DomainIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = ICONS[slug] ?? Users;
  return <Icon aria-hidden="true" strokeWidth={1.75} className={className} />;
}
