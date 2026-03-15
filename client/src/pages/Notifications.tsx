import { useState } from "react";
import { Bell, Mail, Monitor, CheckCircle, XCircle, ShieldAlert, BarChart2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

// ---- Types ----

interface ChannelSetting {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

interface NotificationTypeSetting {
  id: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}

// ---- Data ----

const CHANNELS: ChannelSetting[] = [
  {
    id: "email",
    icon: <Mail className="h-4 w-4 text-neutral-400" />,
    label: "メール通知",
    description: "登録済みメールアドレスに通知を送信",
  },
  {
    id: "browser",
    icon: <Monitor className="h-4 w-4 text-neutral-400" />,
    label: "ブラウザ通知",
    description: "ブラウザのプッシュ通知として受信",
  },
];

const NOTIFICATION_TYPES: NotificationTypeSetting[] = [
  {
    id: "post_success",
    icon: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    label: "投稿成功",
    description: "自動投稿が正常に完了した際に通知",
  },
  {
    id: "post_failure",
    icon: <XCircle className="h-4 w-4 text-red-400" />,
    label: "投稿失敗",
    description: "投稿に失敗した際にアラートを通知",
  },
  {
    id: "account_frozen",
    icon: <ShieldAlert className="h-4 w-4 text-yellow-400" />,
    label: "凍結検知",
    description: "アカウントの凍結・制限を検知した際に通知",
  },
  {
    id: "weekly_report",
    icon: <BarChart2 className="h-4 w-4 text-neutral-400" />,
    label: "週次レポート",
    description: "毎週月曜日に先週の実績サマリーを送信",
  },
];

// ---- Sub-components ----

interface SettingRowProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function SettingRow({ icon, label, description, checked, onCheckedChange }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/[0.06] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-800 shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-neutral-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="shrink-0 data-[state=checked]:bg-emerald-500"
      />
    </div>
  );
}

// ---- Main component ----

export default function Notifications() {
  // Channel toggles
  const [channels, setChannels] = useState<Record<string, boolean>>({
    email: false,
    browser: false,
  });

  // Notification type toggles
  const [types, setTypes] = useState<Record<string, boolean>>({
    post_success: false,
    post_failure: false,
    account_frozen: false,
    weekly_report: false,
  });

  const toggleChannel = (id: string) => (checked: boolean) => {
    setChannels((prev) => ({ ...prev, [id]: checked }));
  };

  const toggleType = (id: string) => (checked: boolean) => {
    setTypes((prev) => ({ ...prev, [id]: checked }));
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Page header */}
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">通知設定</h1>
          <p className="page-subtitle">通知チャネルと通知タイプを管理します</p>
        </div>
      </div>

      {/* Channel settings */}
      <div
        className="fade-in-up bg-neutral-900 border border-white/[0.08] rounded-xl p-5"
        style={{ animationDelay: "40ms" }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 shrink-0">
            <Bell className="h-4 w-4 text-emerald-500" />
          </div>
          <h2 className="text-sm font-semibold text-white">通知チャネル</h2>
        </div>
        <p className="text-xs text-neutral-500 mb-4 ml-[42px]">
          通知を受け取る手段を選択してください
        </p>
        <div className="space-y-0">
          {CHANNELS.map((ch) => (
            <SettingRow
              key={ch.id}
              icon={ch.icon}
              label={ch.label}
              description={ch.description}
              checked={channels[ch.id] ?? false}
              onCheckedChange={toggleChannel(ch.id)}
            />
          ))}
        </div>
      </div>

      {/* Notification type settings */}
      <div
        className="fade-in-up bg-neutral-900 border border-white/[0.08] rounded-xl p-5"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/15 shrink-0">
            <Bell className="h-4 w-4 text-emerald-500" />
          </div>
          <h2 className="text-sm font-semibold text-white">通知タイプ</h2>
        </div>
        <p className="text-xs text-neutral-500 mb-4 ml-[42px]">
          受け取る通知の種類を選択してください
        </p>
        <div className="space-y-0">
          {NOTIFICATION_TYPES.map((nt) => (
            <SettingRow
              key={nt.id}
              icon={nt.icon}
              label={nt.label}
              description={nt.description}
              checked={types[nt.id] ?? false}
              onCheckedChange={toggleType(nt.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
