import {
  Activity,
  BookOpen,
  BarChart3,
  Compass,
  Flame,
  FileText,
  FolderOpen,
  GitCompare,
  MessageCircle,
  Search,
  Settings,
  LayoutDashboard,
} from "lucide-react";

export const destinations = [
  { slug: "overview", label: "Overview", icon: LayoutDashboard },
  { slug: "research-explorer", label: "Research Explorer", icon: Search },
  { slug: "paper-library", label: "Paper Library", icon: BookOpen },
  { slug: "ai-research-assistant", label: "AI Research Assistant", icon: MessageCircle },
  { slug: "experiment-comparison", label: "Evidence Matrix", icon: GitCompare },
  { slug: "scenario-explorer", label: "Scenario Lab", icon: Compass },
  { slug: "fire-simulation", label: "Fire Simulation", icon: Flame },
  { slug: "evidence-gaps", label: "Evidence Gaps", icon: Activity },
  { slug: "scientific-analytics", label: "Research Landscape", icon: BarChart3 },
  { slug: "collections", label: "Collections", icon: FolderOpen },
  { slug: "reports", label: "Reports", icon: FileText },
  { slug: "settings", label: "Settings", icon: Settings },
];
