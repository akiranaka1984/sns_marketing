import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Flame, BrainCircuit, Trophy, GraduationCap } from "lucide-react";

import BuzzAnalysis from "./BuzzAnalysis";
import LearningInsights from "./LearningInsights";
import CompetitorBenchmark from "./CompetitorBenchmark";
import ModelAccounts from "./ModelAccounts";

export default function Insights() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">インサイト</h1>
          <p className="page-subtitle">
            バズ分析・学習インサイト・競合比較・モデルアカウントの統合分析
          </p>
        </div>
      </div>

      <Tabs defaultValue="buzz" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="buzz" className="text-xs gap-1.5">
            <Flame className="h-3.5 w-3.5" />
            バズ分析
          </TabsTrigger>
          <TabsTrigger value="learning" className="text-xs gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5" />
            学習インサイト
          </TabsTrigger>
          <TabsTrigger value="competitor" className="text-xs gap-1.5">
            <Trophy className="h-3.5 w-3.5" />
            競合比較
          </TabsTrigger>
          <TabsTrigger value="model" className="text-xs gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            モデルアカウント
          </TabsTrigger>
        </TabsList>

        <TabsContent value="buzz">
          <BuzzAnalysis />
        </TabsContent>
        <TabsContent value="learning">
          <LearningInsights />
        </TabsContent>
        <TabsContent value="competitor">
          <CompetitorBenchmark />
        </TabsContent>
        <TabsContent value="model">
          <ModelAccounts />
        </TabsContent>
      </Tabs>
    </div>
  );
}
