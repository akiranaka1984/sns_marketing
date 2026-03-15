import { useAuth } from "@/_core/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getLoginUrl } from "@/const";
import {
  LogOut,
  ChevronDown,
  ChevronsLeft,
  Plus,
  Search,
  Settings,
  Moon,
  Sun,
  Menu,
  X,
  Home,
  Inbox,
  Users,
  FolderOpen,
  Bot,
  UserPlus,
  Zap,
  CheckSquare,
  Calendar,
  CalendarDays,
  BarChart3,
  TrendingUp,
  Sparkles,
  FlaskConical,
  GraduationCap,
  Flame,
  Brain,
  Hash,
  Trophy,
  AlertTriangle,
  MessageCircle,
  Lightbulb,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { LanguageSwitcher } from './LanguageSwitcher';
import { NotificationBell } from './NotificationBell';
import { useTheme } from "../contexts/ThemeContext";

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <div className="text-center max-w-sm w-full px-4">
          <div className="mb-5 inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-500">
            <span className="text-white font-semibold text-xl">S</span>
          </div>
          <h1 className="text-[22px] font-medium text-white mb-1 tracking-tight">SNS Marketing</h1>
          <p className="text-[14px] text-neutral-500 mb-6">Automation Platform</p>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white h-12 text-[14px] font-medium rounded-xl border-0 transition-colors duration-150"
          >
            ログイン
          </Button>
        </div>
      </div>
    );
  }

  return <NeoLayout>{children}</NeoLayout>;
}

type NavItem = {
  label: string;
  path: string;
  icon: LucideIcon;
};

type NavSection = {
  title: string;
  items: NavItem[];
  defaultOpen?: boolean;
};

function NeoLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    private: true,
    management: true,
    automation: false,
    analytics: false,
    monitoring: false,
  });

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [mobileOpen]);

  const privatePages: NavItem[] = [
    { icon: Home, label: "ホーム", path: "/" },
    { icon: Inbox, label: "受信トレイ", path: "/inbox" },
  ];

  const sections: NavSection[] = [
    {
      title: "管理",
      defaultOpen: true,
      items: [
        { icon: Users, label: "アカウント", path: "/accounts" },
        { icon: FolderOpen, label: "プラン検討", path: "/projects" },
        { icon: Bot, label: "エージェント", path: "/agents" },
        { icon: UserPlus, label: "チーム管理", path: "/team" },
      ],
    },
    {
      title: "自動化",
      items: [
        { icon: Zap, label: "自動化設定", path: "/automation" },
        { icon: CheckSquare, label: "投稿レビュー", path: "/post-review" },
        { icon: Calendar, label: "スケジュール", path: "/scheduled-posts" },
        { icon: CalendarDays, label: "カレンダー", path: "/content-calendar" },
      ],
    },
    {
      title: "分析",
      items: [
        { icon: BarChart3, label: "分析", path: "/analytics" },
        { icon: TrendingUp, label: "週次レビュー", path: "/weekly-review" },
        { icon: Sparkles, label: "AI最適化", path: "/ai-optimization" },
        { icon: FlaskConical, label: "A/Bテスト", path: "/ab-testing" },
        { icon: GraduationCap, label: "モデル", path: "/model-accounts" },
        { icon: Flame, label: "バズ分析", path: "/buzz-analysis" },
        { icon: Brain, label: "学習インサイト", path: "/learning-insights" },
        { icon: Hash, label: "ハッシュタグ", path: "/hashtag-analytics" },
        { icon: Trophy, label: "競合比較", path: "/competitor-benchmark" },
      ],
    },
    {
      title: "監視",
      items: [
        { icon: AlertTriangle, label: "凍結検知", path: "/freeze-detection" },
        { icon: MessageCircle, label: "エンゲージメント", path: "/engagement" },
      ],
    },
  ];

  const bottomItems: NavItem[] = [
    { icon: Lightbulb, label: "戦略", path: "/strategies" },
    { icon: FileText, label: "ログ", path: "/logs" },
    { icon: Settings, label: "設定", path: "/settings" },
  ];

  const handleNavigate = useCallback((path: string) => {
    setLocation(path);
  }, [setLocation]);

  const isActive = (path: string) => {
    if (path === "/") return location === "/" || location === "/dashboard";
    return location === path || location.startsWith(path + "/");
  };

  const toggleSection = (title: string) => {
    setExpandedSections(prev => ({ ...prev, [title.toLowerCase()]: !prev[title.toLowerCase()] }));
  };

  const NavItemRow = ({ item }: { item: NavItem }) => {
    const active = isActive(item.path);
    const Icon = item.icon;
    return (
      <button
        onClick={() => handleNavigate(item.path)}
        aria-current={active ? 'page' : undefined}
        className={`
          group w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-normal transition-all duration-150
          ${active
            ? "bg-white/[0.08] text-white"
            : "text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200"
          }
        `}
      >
        <Icon
          className={`w-4 h-4 flex-shrink-0 transition-colors duration-150 ${
            active
              ? "text-white"
              : "text-neutral-500 group-hover:text-neutral-300"
          }`}
        />
        {!(isCollapsed && !isMobile) && (
          <span className="flex-1 text-left truncate">
            {item.label}
          </span>
        )}
      </button>
    );
  };

  const SectionGroup = ({ section }: { section: NavSection }) => {
    const isExpanded = expandedSections[section.title.toLowerCase()] ?? section.defaultOpen ?? false;

    return (
      <div className="mt-5">
        <button
          onClick={() => toggleSection(section.title)}
          aria-expanded={isExpanded}
          className="w-full flex items-center gap-1.5 px-2.5 py-[3px] group"
        >
          {!(isCollapsed && !isMobile) && (
            <>
              <span className="text-[11px] font-medium text-neutral-600 uppercase tracking-widest group-hover:text-neutral-500 transition-colors">
                {section.title}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-neutral-700 group-hover:text-neutral-500 transition-all duration-200 ml-0.5 ${isExpanded ? '' : '-rotate-90'}`}
              />
              <Plus className="w-3 h-3 ml-auto text-neutral-700 opacity-0 group-hover:opacity-100 group-hover:text-neutral-500 transition-all duration-150" />
            </>
          )}
        </button>
        {isExpanded && (
          <div className="mt-1 space-y-[2px]">
            {section.items.map((item) => (
              <NavItemRow key={item.path} item={item} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const sidebarContent = (
    <>
      {/* Workspace Switcher */}
      <div className={`flex items-center h-[60px] ${(isCollapsed && !isMobile) ? 'justify-center px-2' : 'px-3'} border-b border-white/[0.06]`}>
        {!(isCollapsed && !isMobile) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 hover:bg-white/[0.04] rounded-lg px-2 py-1.5 transition-all duration-150 flex-1 min-w-0 group">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[12px] font-medium">
                    {user?.name?.charAt(0).toUpperCase() || "S"}
                  </span>
                </div>
                <span className="text-[13px] font-medium text-white truncate">
                  {user?.name || "Workspace"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-600 flex-shrink-0 group-hover:text-neutral-400 transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[240px] p-1.5 border border-white/[0.06] bg-neutral-900 rounded-xl shadow-xl">
              <div className="px-2 py-2">
                <p className="text-[13px] font-normal text-neutral-400">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem onClick={() => logout()} className="text-red-400 focus:text-red-300 text-[13px] rounded-lg font-normal focus:bg-white/[0.04]">
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-all duration-150 flex-shrink-0"
            aria-label="メニューを閉じる"
          >
            <X className="w-4 h-4 text-neutral-400" />
          </button>
        ) : (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 hover:bg-white/[0.04] rounded-lg transition-all duration-150 flex-shrink-0"
            aria-label={isCollapsed ? "展開" : "折りたたむ"}
          >
            <ChevronsLeft className={`w-4 h-4 text-neutral-600 hover:text-neutral-400 transition-all duration-200 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Search */}
      {!(isCollapsed && !isMobile) && (
        <div className="px-3 py-3">
          <button
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-neutral-500 hover:text-neutral-300 bg-white/[0.04] hover:bg-white/[0.06] rounded-lg transition-all duration-150 border border-white/[0.06]"
            aria-label="検索を開く (Cmd+K)"
          >
            <Search className="w-4 h-4" />
            <span>検索</span>
            <span className="ml-auto text-[11px] text-neutral-600 bg-white/[0.06] px-1.5 py-0.5 rounded font-normal">⌘K</span>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="メインナビゲーション">
        <div className="space-y-[2px]">
          {privatePages.map((item) => (
            <NavItemRow key={item.path} item={item} />
          ))}
        </div>

        {sections.map((section) => (
          <SectionGroup key={section.title} section={section} />
        ))}

        <div className="my-4 border-t border-white/[0.06]" />

        <div className="space-y-[2px]">
          {bottomItems.map((item) => (
            <NavItemRow key={item.path} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      {!(isCollapsed && !isMobile) && (
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-1">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] font-normal text-neutral-400 hover:bg-white/[0.04] hover:text-neutral-200 transition-all duration-150"
            aria-label={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
            <span>{theme === 'dark' ? 'ライトモード' : 'ダークモード'}</span>
          </button>
          <LanguageSwitcher />
        </div>
      )}
    </>
  );

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
      {/* Mobile overlay */}
      {isMobile && mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 transition-opacity backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          ${isMobile
            ? `fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-300 ease-in-out ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${isCollapsed ? 'w-[52px]' : 'w-[256px]'} flex-shrink-0 transition-all duration-200 ease-out`
          }
          bg-neutral-950 flex flex-col
          border-r border-white/[0.06]
        `}
        aria-label="サイドバー"
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-[56px] flex items-center justify-between px-5 border-b border-white/[0.06] flex-shrink-0 bg-neutral-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-[13px] text-neutral-500">
            {isMobile && (
              <button
                onClick={() => setMobileOpen(true)}
                className="p-1.5 -ml-1.5 hover:bg-white/[0.04] rounded-lg transition-colors"
                aria-label="メニューを開く"
              >
                <Menu className="w-4 h-4 text-neutral-400" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/settings")}
              className="h-8 w-8 p-0 text-neutral-500 hover:text-neutral-200 hover:bg-white/[0.06] rounded-lg transition-all duration-150"
              aria-label="設定"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto bg-neutral-950">
          <div className="px-4 sm:px-8 py-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
