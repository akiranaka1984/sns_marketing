import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FolderOpen, CheckSquare, Wand2 } from "lucide-react";

import ContentCollection from "./ContentCollection";
import ContentReview from "./ContentReview";
import ContentRewrite from "./ContentRewrite";

export default function ContentManagement() {
  return (
    <div className="space-y-5 max-w-5xl">
      <div className="fade-in-up page-header">
        <div>
          <h1 className="page-title">コンテンツ管理</h1>
          <p className="page-subtitle">
            コンテンツの収集・レビュー・リライトの統合管理
          </p>
        </div>
      </div>

      <Tabs defaultValue="collection" className="space-y-4">
        <TabsList className="bg-muted">
          <TabsTrigger value="collection" className="text-xs gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            コンテンツ収集
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            コンテンツレビュー
          </TabsTrigger>
          <TabsTrigger value="rewrite" className="text-xs gap-1.5">
            <Wand2 className="h-3.5 w-3.5" />
            コンテンツリライト
          </TabsTrigger>
        </TabsList>

        <TabsContent value="collection"><ContentCollection /></TabsContent>
        <TabsContent value="review"><ContentReview /></TabsContent>
        <TabsContent value="rewrite"><ContentRewrite /></TabsContent>
      </Tabs>
    </div>
  );
}
