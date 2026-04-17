import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "cmdk";
import {
  BarChart3,
  Bot,
  FileText,
  FolderKanban,
  Hash,
  Home,
  Layers,
  Settings,
  TestTube2,
  TrendingUp,
  Users,
  Zap,
  Calendar,
  Shield,
  MessageSquare,
  Flame,
  Brain,
  Trophy,
  Lightbulb,
  Eye,
  CheckCheck,
  PlusCircle,
  UserPlus,
  Sparkles,
  Sun,
  Moon,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type PaletteItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  group: string;
  keywords?: string[];
  shortcut?: string;
  badge?: string;
};

type RecentPage = {
  path: string;
  label: string;
  icon: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const RECENT_PAGES_KEY = "recentPages";
const MAX_RECENT = 5;

const PAGE_LABELS: Record<string, { label: string; icon: string }> = {
  "/": { label: "ホーム", icon: "home" },
  "/accounts": { label: "アカウント", icon: "users" },
  "/projects": { label: "プロジェクト", icon: "folder" },
  "/agents": { label: "エージェント", icon: "bot" },
  "/automation": { label: "自動化設定", icon: "zap" },
  "/scheduled-posts": { label: "スケジュール投稿", icon: "calendar" },
  "/post-review": { label: "投稿レビュー", icon: "eye" },
  "/analytics": { label: "分析ダッシュボード", icon: "bar-chart" },
  "/weekly-review": { label: "週次レビュー", icon: "trending-up" },
  "/ab-testing": { label: "A/Bテスト", icon: "test-tube" },
  "/buzz-analysis": { label: "バズ分析", icon: "flame" },
  "/learning-insights": { label: "学習インサイト", icon: "brain" },
  "/hashtag-analytics": { label: "ハッシュタグ分析", icon: "hash" },
  "/competitor-benchmark": { label: "競合比較", icon: "trophy" },
  "/model-accounts": { label: "モデルアカウント", icon: "layers" },
  "/freeze-detection": { label: "凍結検知", icon: "shield" },
  "/engagement": { label: "エンゲージメント", icon: "message" },
  "/strategies": { label: "戦略", icon: "lightbulb" },
  "/logs": { label: "ログ", icon: "file-text" },
  "/settings": { label: "設定", icon: "settings" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readRecentPages(): RecentPage[] {
  try {
    const raw = localStorage.getItem(RECENT_PAGES_KEY);
    return raw ? (JSON.parse(raw) as RecentPage[]) : [];
  } catch {
    return [];
  }
}

function pushRecentPage(path: string): void {
  const meta = PAGE_LABELS[path];
  if (!meta) return;
  const entry: RecentPage = { path, label: meta.label, icon: meta.icon };
  const existing = readRecentPages().filter((p) => p.path !== path);
  const updated = [entry, ...existing].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_PAGES_KEY, JSON.stringify(updated));
  } catch {
    // storage full — ignore
  }
}

function RecentIcon({ name }: { name: string }) {
  const cls = "w-4 h-4";
  switch (name) {
    case "home": return <Home className={cls} />;
    case "users": return <Users className={cls} />;
    case "folder": return <FolderKanban className={cls} />;
    case "bot": return <Bot className={cls} />;
    case "zap": return <Zap className={cls} />;
    case "calendar": return <Calendar className={cls} />;
    case "eye": return <Eye className={cls} />;
    case "bar-chart": return <BarChart3 className={cls} />;
    case "trending-up": return <TrendingUp className={cls} />;
    case "test-tube": return <TestTube2 className={cls} />;
    case "flame": return <Flame className={cls} />;
    case "brain": return <Brain className={cls} />;
    case "hash": return <Hash className={cls} />;
    case "trophy": return <Trophy className={cls} />;
    case "layers": return <Layers className={cls} />;
    case "shield": return <Shield className={cls} />;
    case "message": return <MessageSquare className={cls} />;
    case "lightbulb": return <Lightbulb className={cls} />;
    case "file-text": return <FileText className={cls} />;
    default: return <Settings className={cls} />;
  }
}

// ─── Shortcut badge ───────────────────────────────────────────────────────────

function KbdBadge({ shortcut }: { shortcut: string }) {
  return (
    <kbd className="text-[10px] text-neutral-500 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.06] font-mono ml-auto shrink-0">
      {shortcut}
    </kbd>
  );
}

// ─── Category header ─────────────────────────────────────────────────────────

function CategoryHeader({ label }: { label: string }) {
  return (
    <div className="text-[10px] font-medium uppercase tracking-widest text-neutral-600 px-3 pt-3 pb-1.5 select-none">
      {label}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { theme, toggleTheme, switchable } = useTheme();
  const prevLocationRef = useRef<string>("");

  // ── tRPC queries (enabled only when palette open) ──────────────────────────
  const { data: accounts } = trpc.accounts.list.useQuery(undefined, { enabled: open });
  const { data: projects } = trpc.projects.list.useQuery(undefined, { enabled: open });
  const { data: agents } = trpc.agents.list.useQuery(undefined, { enabled: open });
  const { data: pendingPosts } = trpc.agentScheduledPosts.getPendingReview.useQuery(
    undefined,
    { enabled: open }
  );

  // ── Bulk-approve mutation ───────────────────────────────────────────────────
  const bulkApproveMutation = trpc.agentScheduledPosts.bulkApprove.useMutation({
    onSuccess: (_, vars) => {
      toast.success(`${vars.postIds.length} 件の投稿を承認しました`);
    },
    onError: () => {
      toast.error("承認に失敗しました");
    },
  });

  // ── Track recent pages on location change ──────────────────────────────────
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      prevLocationRef.current = location;
      pushRecentPage(location);
    }
  }, [location]);

  // ── Cmd+K toggle ───────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // ── Cmd+1–5 global shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    const shortcutMap: Record<string, string> = {
      "1": "/",
      "2": "/post-review",
      "3": "/accounts",
      "4": "/scheduled-posts",
      "5": "/analytics",
    };
    const handler = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = shortcutMap[e.key];
      if (target) {
        e.preventDefault();
        setLocation(target);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setLocation]);

  const navigate = useCallback(
    (path: string) => {
      setLocation(path);
      setOpen(false);
    },
    [setLocation]
  );

  // ── Recent pages ───────────────────────────────────────────────────────────
  const recentPages = useMemo(() => (open ? readRecentPages() : []), [open]);

  // ── AI suggested actions ───────────────────────────────────────────────────
  const suggestedActions = useMemo((): PaletteItem[] => {
    const items: PaletteItem[] = [];

    // Pending approval suggestion
    const pendingCount = pendingPosts?.length ?? 0;
    if (pendingCount > 0) {
      items.push({
        id: "suggested_bulk_approve",
        label: `承認待ち ${pendingCount} 件を一括承認`,
        icon: <CheckCheck className="w-4 h-4 text-emerald-400" />,
        action: () => {
          const ids = (pendingPosts ?? []).map((p: { id: number }) => p.id);
          bulkApproveMutation.mutate({ postIds: ids });
          setOpen(false);
        },
        group: "推奨アクション",
        badge: String(pendingCount),
      });
    }

    // Freeze-risk suggestion (static until freeze router exposes account list)
    items.push({
      id: "suggested_freeze_check",
      label: "凍結リスクのあるアカウントを確認",
      icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
      action: () => navigate("/freeze-detection"),
      group: "推奨アクション",
    });

    // Buzz suggestion
    items.push({
      id: "suggested_buzz",
      label: "バズの兆候を確認する",
      icon: <Flame className="w-4 h-4 text-orange-400" />,
      action: () => navigate("/buzz-analysis"),
      group: "推奨アクション",
    });

    return items.slice(0, 3);
  }, [pendingPosts, bulkApproveMutation, navigate]);

  // ── Navigation items ───────────────────────────────────────────────────────
  const navigationItems: PaletteItem[] = useMemo(() => [
    { id: "home", label: "ホーム", icon: <Home className="w-4 h-4" />, action: () => navigate("/"), group: "移動", keywords: ["home", "dashboard"], shortcut: "⌘1" },
    { id: "post-review", label: "投稿レビュー", icon: <Eye className="w-4 h-4" />, action: () => navigate("/post-review"), group: "移動", keywords: ["review"], shortcut: "⌘2" },
    { id: "accounts", label: "アカウント", icon: <Users className="w-4 h-4" />, action: () => navigate("/accounts"), group: "移動", keywords: ["accounts"], shortcut: "⌘3" },
    { id: "scheduled-posts", label: "スケジュール投稿", icon: <Calendar className="w-4 h-4" />, action: () => navigate("/scheduled-posts"), group: "移動", keywords: ["schedule", "posts"], shortcut: "⌘4" },
    { id: "analytics", label: "分析ダッシュボード", icon: <BarChart3 className="w-4 h-4" />, action: () => navigate("/analytics"), group: "移動", keywords: ["analytics", "dashboard"], shortcut: "⌘5" },
    { id: "projects", label: "プロジェクト", icon: <FolderKanban className="w-4 h-4" />, action: () => navigate("/projects"), group: "移動", keywords: ["projects"] },
    { id: "agents", label: "エージェント", icon: <Bot className="w-4 h-4" />, action: () => navigate("/agents"), group: "移動", keywords: ["agents", "ai"] },
    { id: "automation", label: "自動化設定", icon: <Zap className="w-4 h-4" />, action: () => navigate("/automation"), group: "移動", keywords: ["automation"] },
    { id: "weekly-review", label: "週次レビュー", icon: <TrendingUp className="w-4 h-4" />, action: () => navigate("/weekly-review"), group: "分析", keywords: ["weekly", "review"] },
    { id: "ab-testing", label: "A/Bテスト", icon: <TestTube2 className="w-4 h-4" />, action: () => navigate("/ab-testing"), group: "分析", keywords: ["ab", "test"] },
    { id: "buzz-analysis", label: "バズ分析", icon: <Flame className="w-4 h-4" />, action: () => navigate("/buzz-analysis"), group: "分析", keywords: ["buzz", "viral"] },
    { id: "learning-insights", label: "学習インサイト", icon: <Brain className="w-4 h-4" />, action: () => navigate("/learning-insights"), group: "分析", keywords: ["learning", "insights"] },
    { id: "hashtag-analytics", label: "ハッシュタグ分析", icon: <Hash className="w-4 h-4" />, action: () => navigate("/hashtag-analytics"), group: "分析", keywords: ["hashtag"] },
    { id: "competitor-benchmark", label: "競合比較", icon: <Trophy className="w-4 h-4" />, action: () => navigate("/competitor-benchmark"), group: "分析", keywords: ["competitor", "benchmark"] },
    { id: "model-accounts", label: "モデルアカウント", icon: <Layers className="w-4 h-4" />, action: () => navigate("/model-accounts"), group: "分析", keywords: ["model"] },
    { id: "freeze-detection", label: "凍結検知", icon: <Shield className="w-4 h-4" />, action: () => navigate("/freeze-detection"), group: "監視", keywords: ["freeze", "detection"] },
    { id: "engagement", label: "エンゲージメント", icon: <MessageSquare className="w-4 h-4" />, action: () => navigate("/engagement"), group: "監視", keywords: ["engagement"] },
    { id: "strategies", label: "戦略", icon: <Lightbulb className="w-4 h-4" />, action: () => navigate("/strategies"), group: "その他", keywords: ["strategy"] },
    { id: "logs", label: "ログ", icon: <FileText className="w-4 h-4" />, action: () => navigate("/logs"), group: "その他", keywords: ["logs"] },
    { id: "settings", label: "設定", icon: <Settings className="w-4 h-4" />, action: () => navigate("/settings"), group: "その他", keywords: ["settings"] },
  ], [navigate]);

  // ── Action items ───────────────────────────────────────────────────────────
  const actionItems: PaletteItem[] = useMemo(() => [
    {
      id: "action_create_post",
      label: "新規投稿を作成",
      icon: <PlusCircle className="w-4 h-4 text-emerald-400" />,
      action: () => navigate("/scheduled-posts"),
      group: "アクション",
      keywords: ["new", "post", "create"],
    },
    {
      id: "action_add_account",
      label: "新規アカウントを追加",
      icon: <UserPlus className="w-4 h-4 text-blue-400" />,
      action: () => navigate("/accounts"),
      group: "アクション",
      keywords: ["add", "account", "new"],
    },
    {
      id: "action_create_agent",
      label: "新規エージェントを作成",
      icon: <Bot className="w-4 h-4 text-purple-400" />,
      action: () => navigate("/agents?new=1"),
      group: "アクション",
      keywords: ["new", "agent", "create"],
    },
    {
      id: "action_ai_strategy",
      label: "AIに戦略を立ててもらう",
      icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
      action: () => {
        toast.info("近日実装");
        setOpen(false);
      },
      group: "アクション",
      keywords: ["ai", "strategy", "generate"],
    },
    {
      id: "action_toggle_theme",
      label: switchable
        ? theme === "dark"
          ? "ライトモードに切り替え"
          : "ダークモードに切り替え"
        : "テーマ切替（近日実装）",
      icon: theme === "dark"
        ? <Sun className="w-4 h-4 text-yellow-300" />
        : <Moon className="w-4 h-4 text-blue-300" />,
      action: () => {
        if (switchable && toggleTheme) {
          toggleTheme();
          toast.success(theme === "dark" ? "ライトモードに切り替えました" : "ダークモードに切り替えました");
        } else {
          toast.info("近日実装");
        }
        setOpen(false);
      },
      group: "アクション",
      keywords: ["theme", "dark", "light", "mode"],
    },
  ], [navigate, theme, toggleTheme, switchable]);

  // ── Group navigation items by their group ─────────────────────────────────
  const navGroups = useMemo(() => {
    const groups = [...new Set(navigationItems.map((item) => item.group))];
    return groups;
  }, [navigationItems]);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <Command
        className="bg-neutral-900/95 backdrop-blur-xl border border-white/[0.10] rounded-none md:rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.60)] overflow-hidden"
        loop
      >
        {/* Search input */}
        <div className="border-b border-white/[0.08]">
          <CommandInput
            placeholder="ページ、アカウント、アクションを検索..."
            className="h-12 text-[15px] font-normal text-neutral-50 placeholder:text-neutral-500 bg-transparent border-none outline-none px-4"
          />
        </div>

        <CommandList className="max-h-[calc(100vh-80px)] md:max-h-[480px] overflow-y-auto py-1">
          <CommandEmpty className="py-8 text-center text-[13px] text-neutral-500">
            結果が見つかりませんでした
          </CommandEmpty>

          {/* ── 推奨アクション (AI suggested) ──────────────────────────────── */}
          {suggestedActions.length > 0 && (
            <>
              <CategoryHeader label="推奨アクション" />
              <CommandGroup>
                {suggestedActions.map((item) => (
                  <PaletteRow key={item.id} item={item} />
                ))}
              </CommandGroup>
              <CommandSeparator className="bg-white/[0.06] my-1" />
            </>
          )}

          {/* ── 最近アクセス ─────────────────────────────────────────────── */}
          {recentPages.length > 0 && (
            <>
              <CategoryHeader label="最近アクセス" />
              <CommandGroup>
                {recentPages.map((page) => (
                  <CommandItem
                    key={`recent-${page.path}`}
                    value={`recent ${page.label} ${page.path}`}
                    onSelect={() => navigate(page.path)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] cursor-pointer text-neutral-300 data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-neutral-50 data-[selected=true]:border-l-2 data-[selected=true]:border-emerald-500 data-[selected=true]:pl-[10px] hover:bg-white/[0.06] hover:text-neutral-50 transition-colors"
                  >
                    <span className="text-neutral-500 shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-neutral-400 shrink-0">
                      <RecentIcon name={page.icon} />
                    </span>
                    <span className="flex-1 truncate">{page.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator className="bg-white/[0.06] my-1" />
            </>
          )}

          {/* ── 移動 / Navigation ─────────────────────────────────────────── */}
          {navGroups.map((group) => (
            <div key={group}>
              <CategoryHeader label={group} />
              <CommandGroup>
                {navigationItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <PaletteRow key={item.id} item={item} />
                  ))}
              </CommandGroup>
              <CommandSeparator className="bg-white/[0.06] my-1" />
            </div>
          ))}

          {/* ── アクション ────────────────────────────────────────────────── */}
          <CategoryHeader label="アクション" />
          <CommandGroup>
            {actionItems.map((item) => (
              <PaletteRow key={item.id} item={item} />
            ))}
          </CommandGroup>

          {/* ── Dynamic: Accounts ─────────────────────────────────────────── */}
          {accounts && accounts.length > 0 && (
            <>
              <CommandSeparator className="bg-white/[0.06] my-1" />
              <CategoryHeader label="アカウント" />
              <CommandGroup>
                {accounts.slice(0, 5).map((account: { id: number; username: string; platform: string }) => (
                  <CommandItem
                    key={`account-${account.id}`}
                    value={`${account.username} ${account.platform} account`}
                    onSelect={() => navigate(`/accounts/${account.id}`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] cursor-pointer text-neutral-300 data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-neutral-50 data-[selected=true]:border-l-2 data-[selected=true]:border-emerald-500 data-[selected=true]:pl-[10px] hover:bg-white/[0.06] hover:text-neutral-50 transition-colors"
                  >
                    <Users className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="flex-1 truncate">@{account.username}</span>
                    <span className="text-[11px] text-neutral-500 bg-white/[0.05] px-1.5 py-0.5 rounded border border-white/[0.06] font-mono">
                      {account.platform}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── Dynamic: Projects ─────────────────────────────────────────── */}
          {projects && projects.length > 0 && (
            <>
              <CommandSeparator className="bg-white/[0.06] my-1" />
              <CategoryHeader label="プロジェクト" />
              <CommandGroup>
                {projects.slice(0, 5).map((project: { id: number; name: string }) => (
                  <CommandItem
                    key={`project-${project.id}`}
                    value={`${project.name} project`}
                    onSelect={() => navigate(`/projects/${project.id}`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] cursor-pointer text-neutral-300 data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-neutral-50 data-[selected=true]:border-l-2 data-[selected=true]:border-emerald-500 data-[selected=true]:pl-[10px] hover:bg-white/[0.06] hover:text-neutral-50 transition-colors"
                  >
                    <FolderKanban className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="flex-1 truncate">{project.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {/* ── Dynamic: Agents ───────────────────────────────────────────── */}
          {agents && agents.length > 0 && (
            <>
              <CommandSeparator className="bg-white/[0.06] my-1" />
              <CategoryHeader label="エージェント" />
              <CommandGroup>
                {agents.slice(0, 5).map((agent: { id: number; name: string }) => (
                  <CommandItem
                    key={`agent-${agent.id}`}
                    value={`${agent.name} agent`}
                    onSelect={() => navigate(`/agents/${agent.id}`)}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] cursor-pointer text-neutral-300 data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-neutral-50 data-[selected=true]:border-l-2 data-[selected=true]:border-emerald-500 data-[selected=true]:pl-[10px] hover:bg-white/[0.06] hover:text-neutral-50 transition-colors"
                  >
                    <Bot className="w-4 h-4 text-neutral-500 shrink-0" />
                    <span className="flex-1 truncate">{agent.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>

        {/* Footer hint */}
        <div className="border-t border-white/[0.06] px-3 py-2 flex items-center gap-3 text-[11px] text-neutral-600">
          <span><kbd className="text-[10px] font-mono">↑↓</kbd> 移動</span>
          <span><kbd className="text-[10px] font-mono">↵</kbd> 実行</span>
          <span><kbd className="text-[10px] font-mono">Esc</kbd> 閉じる</span>
          <span className="ml-auto"><kbd className="text-[10px] font-mono">⌘K</kbd> パレット</span>
        </div>
      </Command>
    </CommandDialog>
  );
}

// ─── Reusable palette row ─────────────────────────────────────────────────────

function PaletteRow({ item }: { item: PaletteItem }) {
  return (
    <CommandItem
      key={item.id}
      value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
      onSelect={item.action}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] cursor-pointer text-neutral-300 data-[selected=true]:bg-white/[0.08] data-[selected=true]:text-neutral-50 data-[selected=true]:border-l-2 data-[selected=true]:border-emerald-500 data-[selected=true]:pl-[10px] hover:bg-white/[0.06] hover:text-neutral-50 transition-colors"
    >
      <span className="text-neutral-500 shrink-0">{item.icon}</span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-medium">
          {item.badge}
        </span>
      )}
      {item.shortcut && <KbdBadge shortcut={item.shortcut} />}
    </CommandItem>
  );
}
