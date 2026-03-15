# tRPC API クイックスタートガイド

**最終更新**: 2026年3月15日

5分で始めるtRPC APIガイド。最も一般的なユースケースを網羅しています。

---

## セットアップ

### 1. tRPCクライアントをインポート

```typescript
// client/src/hooks/useApi.ts
import { trpc } from '@/_core/trpc'; // または適切なパスに変更
```

---

## よくあるタスク

### アカウント管理

#### アカウント一覧を取得

```typescript
const { data: accounts, isLoading } = trpc.accounts.list.useQuery();

if (isLoading) return <div>読み込み中...</div>;

return (
  <div>
    {accounts?.map(account => (
      <div key={account.id}>{account.username} ({account.platform})</div>
    ))}
  </div>
);
```

#### 新しいアカウントを追加

```typescript
const createAccount = trpc.accounts.create.useMutation();

const handleAddAccount = async () => {
  const result = await createAccount.mutateAsync({
    platform: 'twitter',
    username: '@myaccount',
    password: 'secure-password'
  });

  console.log('アカウント作成:', result.id);
};

return (
  <button onClick={handleAddAccount} disabled={createAccount.isPending}>
    {createAccount.isPending ? '作成中...' : 'アカウント追加'}
  </button>
);
```

#### アカウント詳細を取得

```typescript
const { data: account } = trpc.accounts.get.useQuery(
  { accountId: 1 },
  { enabled: !!accountId } // accountIdが存在する場合のみ実行
);

return <div>{account?.username}</div>;
```

#### アカウント設定を更新

```typescript
const updateAccount = trpc.accounts.update.useMutation({
  onSuccess: () => {
    // 成功時の処理
    toast.success('アカウントを更新しました');
  },
  onError: (error) => {
    // エラー処理
    toast.error(error.message);
  }
});

await updateAccount.mutateAsync({
  accountId: 1,
  xHandle: '@newhandle',
  planType: 'premium'
});
```

---

### プロジェクト管理

#### プロジェクト一覧を取得

```typescript
const { data: projects } = trpc.projects.list.useQuery();

return (
  <ul>
    {projects?.map(project => (
      <li key={project.id}>
        {project.name} ({project.accountCount} accounts, {project.postCount} posts)
      </li>
    ))}
  </ul>
);
```

#### 新規プロジェクトを作成

```typescript
const createProject = trpc.projects.create.useMutation();

const handleCreate = async () => {
  const { id } = await createProject.mutateAsync({
    name: '春のキャンペーン',
    objective: 'ブランド認知向上',
    description: '3月～4月のプロモーション',
    startDate: '2026-03-15',
    endDate: '2026-04-30',
    targets: {
      followers: 10000,
      engagement_rate: 5.5,
      reach: 50000
    }
  });

  console.log('プロジェクト作成:', id);
};
```

#### プロジェクト詳細を取得

```typescript
const projectId = useParams().id;
const { data: project } = trpc.projects.byId.useQuery(
  { id: parseInt(projectId) }
);

return (
  <div>
    <h1>{project?.name}</h1>
    <p>目標: {project?.objective}</p>
    <p>アカウント数: {project?.accounts.length}</p>
    <p>投稿数: {project?.posts.length}</p>
  </div>
);
```

#### プロジェクト実行モードを変更

```typescript
const updateMode = trpc.projects.updateMode.useMutation();

// 全自動モードに切り替え
await updateMode.mutateAsync({
  id: projectId,
  executionMode: 'fullAuto' // または 'confirm', 'manual'
});

// 注意: fullAutoモードでは保留中の投稿が自動承認されます
```

---

### 投稿スケジューリング

#### スケジュール投稿の一覧を取得

```typescript
const { data: posts } = trpc.scheduledPosts.getAll.useQuery({
  projectId: 1,
  status: 'pending',
  limit: 50
});

return (
  <table>
    <thead>
      <tr>
        <th>内容</th>
        <th>スケジュール</th>
        <th>ステータス</th>
      </tr>
    </thead>
    <tbody>
      {posts?.map(post => (
        <tr key={post.id}>
          <td>{post.content.substring(0, 50)}...</td>
          <td>{new Date(post.scheduledTime).toLocaleString('ja-JP')}</td>
          <td>{post.status}</td>
        </tr>
      ))}
    </tbody>
  </table>
);
```

#### 投稿をスケジュール

```typescript
const schedulePost = trpc.scheduledPosts.create.useMutation();

const handleSchedulePost = async () => {
  await schedulePost.mutateAsync({
    projectId: 1,
    accountId: 1,
    content: '今日はいい天気ですね！🌞',
    hashtags: '#良い天気 #日本',
    scheduledTime: new Date('2026-03-16T09:00:00'),
    repeatInterval: 'daily'  // 毎日投稿
  });
};
```

#### 投稿をすぐに発行

```typescript
const publishNow = trpc.scheduledPosts.publishNow.useMutation();

await publishNow.mutateAsync({ id: postId });
```

#### 投稿統計を取得

```typescript
const { data: stats } = trpc.scheduledPosts.getStats.useQuery({
  projectId: 1,
  days: 30
});

return (
  <div>
    <p>総投稿数: {stats?.total}</p>
    <p>投稿済み: {stats?.byStatus.posted}</p>
    <p>失敗: {stats?.byStatus.failed}</p>
    <p>成功率: {stats?.successRate}%</p>
  </div>
);
```

---

### エージェント管理

#### エージェント一覧を取得

```typescript
const { data: agents } = trpc.agents.list.useQuery();

return (
  <div>
    {agents?.map(agent => (
      <div key={agent.id}>
        <h3>{agent.name}</h3>
        <p>テーマ: {agent.theme}</p>
        <p>トーン: {agent.tone}</p>
      </div>
    ))}
  </div>
);
```

#### 新しいエージェントを作成

```typescript
const createAgent = trpc.agents.create.useMutation();

await createAgent.mutateAsync({
  name: 'テックニュースエージェント',
  theme: 'テクノロジーニュース',
  tone: 'professional',
  style: 'news',
  targetAudience: 'エンジニア',
  postingFrequency: 'twice_daily',
  postingTimeSlots: ['09:00', '18:00'],
  projectId: 1
});
```

#### エージェントにアカウントをリンク

```typescript
const linkAccount = trpc.agents.linkAccount.useMutation();

await linkAccount.mutateAsync({
  agentId: 1,
  accountId: 2
});
```

#### エージェントでコンテンツを生成

```typescript
const generateContent = trpc.scheduledPosts.generateWithAgent.useMutation();

const { data } = await generateContent.mutateAsync({
  agentId: 1,
  accountId: 2
});

// 結果
// data.content      - 生成されたテキスト
// data.hashtags     - ハッシュタグリスト
// data.mediaPrompt  - メディア生成プロンプト
// data.confidence   - 信頼度
```

---

### 分析

#### パフォーマンス概要を取得

```typescript
const { data: overview } = trpc.analytics.getOverview.useQuery({
  startDate: '2026-03-01',
  endDate: '2026-03-15'
});

return (
  <div>
    <div>総投稿数: {overview?.totalPosts}</div>
    <div>総ビュー数: {overview?.totalViews}</div>
    <div>総いいね数: {overview?.totalLikes}</div>
    <div>平均エンゲージメント率: {overview?.avgEngagementRate.toFixed(2)}%</div>
  </div>
);
```

---

### エンゲージメント管理

#### エンゲージメントタスクを作成

```typescript
const createTask = trpc.engagement.createTask.useMutation();

await createTask.mutateAsync({
  projectId: 1,
  accountId: 1,
  taskType: 'like',
  targetUser: '@influencer',
  frequency: 10  // 1日10回
});
```

#### エンゲージメント統計を取得

```typescript
const { data: stats } = trpc.engagement.getStats.useQuery({
  accountId: 1,
  days: 30
});

return (
  <div>
    <p>成功: {stats?.byStatus.success}</p>
    <p>失敗: {stats?.byStatus.failed}</p>
    <p>成功率: {stats?.successRate}%</p>
    <p>いいね: {stats?.byType.like}</p>
    <p>フォロー: {stats?.byType.follow}</p>
  </div>
);
```

---

### X API設定

#### X API設定を取得

```typescript
const { data: settings } = trpc.xApiSettings.get.useQuery();

return (
  <div>
    <p>設定済み: {settings?.configured ? 'はい' : 'いいえ'}</p>
    <p>OAuth: {settings?.oauthConfigured ? '接続済み' : '未接続'}</p>
    <p>ティア: {settings?.apiTier}</p>
  </div>
);
```

#### X API接続をテスト

```typescript
const testConnection = trpc.xApiSettings.testConnection.useMutation();

const { data } = await testConnection.mutateAsync({
  bearerToken: 'AAAA...'
});

if (data.success) {
  toast.success('接続成功');
} else {
  toast.error(data.message);
}
```

#### API使用状況を確認

```typescript
const { data: usage } = trpc.xApiSettings.getApiUsage.useQuery();
const { data: limit } = trpc.xApiSettings.getMonthlyLimit.useQuery();

return (
  <div>
    <p>今月: {usage?.month}</p>
    <p>ツイート数: {usage?.totalTweets} / {limit?.monthlyLimit}</p>
    <div style={{
      width: '100%',
      height: '20px',
      backgroundColor: '#eee',
      borderRadius: '4px',
      overflow: 'hidden'
    }}>
      <div style={{
        height: '100%',
        width: `${(usage?.totalTweets / (limit?.monthlyLimit || 1)) * 100}%`,
        backgroundColor: '#3b82f6'
      }} />
    </div>
  </div>
);
```

---

### 認証・ユーザー

#### 現在のユーザーを確認

```typescript
const { data: user } = trpc.auth.me.useQuery();

return <div>ログイン中: {user?.openId}</div>;
```

#### ログアウト

```typescript
const logout = trpc.auth.logout.useMutation({
  onSuccess: () => {
    // セッションクッキーが削除されます
    window.location.href = '/login';
  }
});

return (
  <button onClick={() => logout.mutate()}>
    ログアウト
  </button>
);
```

---

### エラーハンドリング

```typescript
const createProject = trpc.projects.create.useMutation({
  onError: (error) => {
    // tRPCエラーの詳細を確認
    if (error.data?.code === 'CONFLICT') {
      toast.error('このプロジェクトは既に存在します');
    } else if (error.data?.code === 'UNAUTHORIZED') {
      toast.error('ログインが必要です');
      window.location.href = '/login';
    } else {
      toast.error(error.message);
    }
  }
});
```

---

### ローディング・キャッシュ管理

```typescript
// ローディング状態
const { data, isLoading, isFetching } = trpc.projects.list.useQuery();

if (isLoading) return <Spinner />;

// キャッシュを無効化（再取得）
const utils = trpc.useUtils();

const createProject = trpc.projects.create.useMutation({
  onSuccess: () => {
    // プロジェクト一覧キャッシュを更新
    utils.projects.list.invalidate();
  }
});

// 手動で再取得
const refetch = () => {
  utils.projects.list.refetch();
};
```

---

### リアクティブ更新

```typescript
// プロジェクトIDが変わった時のみクエリを実行
const { data: project } = trpc.projects.byId.useQuery(
  { id: projectId },
  {
    enabled: !!projectId,  // projectIdがある場合のみ実行
    staleTime: 1000 * 60 * 5, // 5分間キャッシュ
  }
);
```

---

## デバッグ

### ブラウザコンソール

```typescript
// tRPCクライアントのログを有効化
trpc.useUtils().client.middleware((opts) => {
  console.log('[TRPC Request]', opts.path, opts.input);
  return async (next) => {
    const result = await next();
    console.log('[TRPC Response]', opts.path, result);
    return result;
  };
});
```

### ネットワークタブを確認

1. 開発者ツール（F12）を開く
2. Network タブを選択
3. "Name" で `/api/trpc/` を含む項目を確認
4. 詳細を見て Request/Response を確認

---

## よくある質問

### Q: キャッシュを破棄したい

```typescript
const utils = trpc.useUtils();
utils.projects.list.reset(); // 完全にリセット
```

### Q: 複数のクエリを同時実行したい

```typescript
const results = await Promise.all([
  trpc.projects.list.query(),
  trpc.accounts.list.query(),
  trpc.agents.list.query(),
]);
```

### Q: 条件付きでリクエストを送りたい

```typescript
const { data } = trpc.projects.byId.useQuery(
  { id: projectId },
  {
    enabled: !!projectId && isReadyToFetch
  }
);
```

### Q: エラーをリトライしたい

```typescript
const mutation = trpc.projects.create.useMutation({
  retry: 3,           // 3回までリトライ
  retryDelay: 1000,   // 1秒待機
});
```

---

## サンプルコンポーネント

### プロジェクト作成フォーム

```typescript
import { useState } from 'react';
import { trpc } from '@/_core/trpc';

export function CreateProjectForm() {
  const [formData, setFormData] = useState({
    name: '',
    objective: '',
    startDate: '',
    endDate: '',
  });

  const createProject = trpc.projects.create.useMutation({
    onSuccess: (data) => {
      console.log('プロジェクト作成:', data.id);
      setFormData({ name: '', objective: '', startDate: '', endDate: '' });
      // UIを更新するなど
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createProject.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="プロジェクト名"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <input
        type="text"
        placeholder="目的"
        value={formData.objective}
        onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
        required
      />
      <input
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
      />
      <input
        type="date"
        value={formData.endDate}
        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
      />
      <button
        type="submit"
        disabled={createProject.isPending}
      >
        {createProject.isPending ? '作成中...' : 'プロジェクト作成'}
      </button>
      {createProject.isError && (
        <p style={{ color: 'red' }}>
          エラー: {createProject.error.message}
        </p>
      )}
    </form>
  );
}
```

---

## 次のステップ

詳細情報については以下を参照してください：

- [完全なAPI リファレンス](./API_REFERENCE.md) - すべてのエンドポイント
- [実装ガイド](./API_IMPLEMENTATION_GUIDE.md) - 新しいエンドポイント追加方法
- [tRPC公式ドキュメント](https://trpc.io/)

---

**最後に**: このガイドで不明な点があれば、プロジェクト内の既存のコンポーネントを参考にしてください。
