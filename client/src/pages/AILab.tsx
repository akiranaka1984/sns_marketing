import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FlaskConical, Sparkles, Calendar } from "lucide-react";

import ABTesting from "./ABTesting";
import AIOptimization from "./AIOptimization";
import WeeklyReview from "./WeeklyReview";

export default function AILab() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">AIラボ</h1>
          <p className="page-subtitle">
            A/Bテスト・AI最適化・週次レビューの統合管理
          </p>
        </div>
      </div>

      <Tabs defaultValue="ab-testing" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="ab-testing" className="text-xs gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            A/Bテスト
          </TabsTrigger>
          <TabsTrigger value="optimization" className="text-xs gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            AI最適化
          </TabsTrigger>
          <TabsTrigger value="weekly" className="text-xs gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            週次レビュー
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ab-testing">
          <ABTesting />
        </TabsContent>
        <TabsContent value="optimization">
          <AIOptimization />
        </TabsContent>
        <TabsContent value="weekly">
          <WeeklyReview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
