import {
  Activity,
  BookOpen,
  BarChart3,
  Compass,
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
  { slug: "experiment-comparison", label: "Experiment Comparison", icon: GitCompare },
  { slug: "scenario-explorer", label: "Scenario Explorer", icon: Compass },
  { slug: "evidence-gaps", label: "Evidence Gaps", icon: Activity },
  { slug: "scientific-analytics", label: "Scientific Analytics", icon: BarChart3 },
  { slug: "collections", label: "Collections", icon: FolderOpen },
  { slug: "reports", label: "Reports", icon: FileText },
  { slug: "settings", label: "Settings", icon: Settings },
];
