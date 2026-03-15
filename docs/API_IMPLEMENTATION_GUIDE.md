# tRPC API 実装ガイド

**最終更新**: 2026年3月15日

このガイドは、tRPCでのAPIエンドポイント実装、テスト、および保守に関するベストプラクティスを提供します。

---

## 目次

1. [アーキテクチャ概要](#アーキテクチャ概要)
2. [新しいルーターの作成](#新しいルーターの作成)
3. [プロシージャ（Procedure）の作成](#プロシージャの作成)
4. [入力バリデーション](#入力バリデーション)
5. [エラーハンドリング](#エラーハンドリング)
6. [認可・認証](#認可認証)
7. [テストの書き方](#テストの書き方)
8. [ベストプラクティス](#ベストプラクティス)
9. [デバッグ・トラブルシューティング](#デバッグトラブルシューティング)

---

## アーキテクチャ概要

### ディレクトリ構成

```
server/
├── routers.ts              # メインルーター統合ポイント
├── routers/
│   └── automation.ts       # 自動化ルーター
├── settings.routers.ts
├── projects.routers.ts
├── scheduled-posts.routers.ts
├── agents.routers.ts
├── _core/
│   ├── trpc.ts            # tRPC初期化・プロシージャ定義
│   ├── context.ts         # リクエストコンテキスト
│   └── systemRouter.ts    # システムルーター
├── db.ts                  # データベースアクセス層
├── services/              # ビジネスロジック
│   ├── account-growth-service.ts
│   ├── auto-optimization-scheduler.ts
│   └── ...
└── utils/
    └── logger.ts          # ロギングユーティリティ
```

### 基本的なフロー

```
Client (React)
    ↓
tRPC Client Hook
    ↓
tRPC Procedure (Input Validation)
    ↓
Business Logic (Service Layer)
    ↓
Database (Drizzle ORM)
    ↓
Response
```

---

## 新しいルーターの作成

### ステップ1: ルーターファイルの作成

`server/my-feature.routers.ts`を作成：

```typescript
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "./db";
import { myFeatureTable } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createLogger } from "./utils/logger";

const logger = createLogger("my-feature.routers");

export const myFeatureRouter = router({
  // プロシージャはここに追加
});
```

### ステップ2: 既存ルーターに統合

`server/routers.ts`で新しいルーターをインポート・登録：

```typescript
import { myFeatureRouter } from "./my-feature.routers";

export const appRouter = router({
  // 既存ルーター...
  myFeature: myFeatureRouter,
});
```

---

## プロシージャ（Procedure）の作成

### Query プロシージャ（読み取り）

```typescript
// シンプルなリスト取得
list: protectedProcedure.query(async ({ ctx }) => {
  return await db
    .select()
    .from(myFeatureTable)
    .where(eq(myFeatureTable.userId, ctx.user.id));
}),

// 入力パラメータを受け取る
byId: protectedProcedure
  .input(z.object({
    id: z.number().positive("IDは正の数値である必要があります")
  }))
  .query(async ({ ctx, input }) => {
    const item = await db.query.myFeatureTable.findFirst({
      where: eq(myFeatureTable.id, input.id)
    });

    if (!item) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Item with id ${input.id} not found`
      });
    }

    return item;
  }),

// フィルターと結果加工
list: protectedProcedure
  .input(z.object({
    status: z.enum(['active', 'inactive']).optional(),
    limit: z.number().default(50).max(1000),
  }))
  .query(async ({ ctx, input }) => {
    const conditions = [eq(myFeatureTable.userId, ctx.user.id)];

    if (input.status) {
      conditions.push(eq(myFeatureTable.status, input.status));
    }

    const items = await db.query.myFeatureTable.findMany({
      where: and(...conditions),
      limit: input.limit,
    });

    // 結果を加工・フォーマット
    return items.map(item => ({
      ...item,
      displayName: `${item.name} (${item.status})`,
    }));
  }),
```

### Mutation プロシージャ（書き込み）

```typescript
// 作成
create: protectedProcedure
  .input(z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    const [newItem] = await db
      .insert(myFeatureTable)
      .values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
        createdAt: new Date().toISOString(),
      })
      .$returningId();

    logger.info({ id: newItem.id }, "Item created");
    return { id: newItem.id };
  }),

// 更新
update: protectedProcedure
  .input(z.object({
    id: z.number(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  }))
  .mutation(async ({ ctx, input }) => {
    // 所有権確認
    const item = await db.query.myFeatureTable.findFirst({
      where: eq(myFeatureTable.id, input.id)
    });

    if (!item || item.userId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Item not found or unauthorized"
      });
    }

    // 更新フィールドのみを組み立て
    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;

    await db
      .update(myFeatureTable)
      .set(updateData)
      .where(eq(myFeatureTable.id, input.id));

    logger.info({ id: input.id }, "Item updated");
    return { success: true };
  }),

// 削除
delete: protectedProcedure
  .input(z.object({ id: z.number() }))
  .mutation(async ({ ctx, input }) => {
    // 所有権確認
    const item = await db.query.myFeatureTable.findFirst({
      where: eq(myFeatureTable.id, input.id)
    });

    if (!item || item.userId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Item not found or unauthorized"
      });
    }

    await db.delete(myFeatureTable).where(eq(myFeatureTable.id, input.id));

    logger.info({ id: input.id }, "Item deleted");
    return { success: true };
  }),
```

---

## 入力バリデーション

### Zod スキーマの定義

```typescript
// 基本型
const nameSchema = z.string()
  .min(1, "名前は空にできません")
  .max(255, "名前は255文字以下である必要があります");

const idSchema = z.number().positive("IDは正の数値である必要があります");

// Enum
const statusSchema = z.enum(['draft', 'active', 'paused', 'completed']);

// Object
const createInputSchema = z.object({
  name: nameSchema,
  status: statusSchema.default('draft'),
  description: z.string().optional(),
  tags: z.array(z.string()).min(0).max(10),
});

// 再利用可能な検証
const updateInputSchema = createInputSchema.partial().merge(z.object({
  id: idSchema,
}));

// Union
const contentSchema = z.union([
  z.object({ type: z.literal('text'), text: z.string() }),
  z.object({ type: z.literal('image'), imageUrl: z.string().url() }),
]);

// カスタム検証
const emailSchema = z.string().email().refine(
  async (email) => {
    const exists = await checkEmailExists(email);
    return !exists;
  },
  { message: "メールアドレスは既に登録されています" }
);
```

### 入力バリデーションの実装

```typescript
create: protectedProcedure
  .input(createInputSchema)
  .mutation(async ({ ctx, input }) => {
    // このポイントで `input` は既に型安全で検証済み
    // バリデーションエラーは自動的に cliet に返却される
    const item = await db.insert(myFeatureTable).values({
      userId: ctx.user.id,
      ...input,
    });

    return item;
  }),
```

---

## エラーハンドリング

### TRPCError の使用

```typescript
import { TRPCError } from "@trpc/server";

// 基本的なエラー
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Item not found"
});

// 詳細情報を含める
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid input",
  cause: { field: "email", reason: "already_exists" }
});

// 予期しないエラーをキャッチ
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  logger.error({ error }, "Unexpected error occurred");
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred"
  });
}
```

### エラーコード表

| コード | 説明 | 用途 |
|--------|------|------|
| `BAD_REQUEST` | 入力値が無効 | バリデーション失敗 |
| `UNAUTHORIZED` | 認証が必要 | ログイン未済み |
| `FORBIDDEN` | アクセス権がない | 権限不足 |
| `NOT_FOUND` | リソースが見つからない | ID無効など |
| `CONFLICT` | リソース競合 | 重複レコード |
| `PRECONDITION_FAILED` | 前提条件不満 | 初期化不十分 |
| `INTERNAL_SERVER_ERROR` | サーバーエラー | 予期しないエラー |

---

## 認可・認証

### コンテキストの構造

```typescript
// _core/context.ts
type Context = {
  user: {
    id: number,
    openId: string,
    // その他のユーザー情報
  } | null,
  req: Request,
  res: Response,
};
```

### 認可パターン

```typescript
// パターン1: ユーザー認証のみ（すべてのユーザーがアクセス可能）
protectedProcedure.query(async ({ ctx }) => {
  const userId = ctx.user.id;
  // ...
}),

// パターン2: リソース所有権確認
byId: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const item = await db.query.myFeatureTable.findFirst({
      where: eq(myFeatureTable.id, input.id)
    });

    // リソースがユーザーに属するか確認
    if (!item || item.userId !== ctx.user.id) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Resource not found or unauthorized"
      });
    }

    return item;
  }),

// パターン3: ロールベース認可（実装例）
adminOnly: protectedProcedure
  .mutation(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required"
      });
    }
    // ...
  }),
```

---

## テストの書き方

### ユニットテスト（Vitest）

`server/my-feature.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from './db';
import { myFeatureTable } from '../drizzle/schema';

// モック
vi.mock('./db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

describe('myFeatureRouter', () => {
  describe('create', () => {
    it('should create an item with valid input', async () => {
      const input = {
        name: 'Test Item',
        description: 'A test item'
      };

      const mockDb = db as any;
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockResolvedValue([{ id: 1 }])
      });

      // テスト実行
      const result = await myFeatureRouter.createCaller({
        user: { id: 123 },
        req: {},
        res: {}
      }).create(input);

      expect(result.id).toBe(1);
    });

    it('should throw error with invalid name', async () => {
      const input = {
        name: '', // 無効：空文字列
        description: 'Test'
      };

      expect(() => {
        // バリデーションで失敗
      }).toThrow();
    });
  });

  describe('authorization', () => {
    it('should not allow unauthorized access', async () => {
      const input = { id: 1 };

      // ユーザー2で、ユーザー1のリソースにアクセス
      expect(async () => {
        await myFeatureRouter.createCaller({
          user: { id: 2 },
          req: {},
          res: {}
        }).get(input);
      }).rejects.toThrow('NOT_FOUND');
    });
  });
});
```

### E2Eテスト

```typescript
import { test, expect } from '@playwright/test';

test('create and retrieve item', async ({ page }) => {
  // 1. アイテムを作成
  const response1 = await page.evaluate(async () => {
    return await fetch('/api/trpc/myFeature.create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Item',
        description: 'Test'
      })
    }).then(r => r.json());
  });

  const itemId = response1.result.data.id;

  // 2. アイテムを取得
  const response2 = await page.evaluate(async (id) => {
    return await fetch(`/api/trpc/myFeature.byId?input=${id}`)
      .then(r => r.json());
  }, itemId);

  expect(response2.result.data.name).toBe('Test Item');
});
```

---

## ベストプラクティス

### 1. エラーメッセージは明確に

```typescript
// ❌ 悪い例
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid input"
});

// ✅ 良い例
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Invalid email format. Please provide a valid email address."
});
```

### 2. ロギングを適切に実装

```typescript
import { createLogger } from "./utils/logger";
const logger = createLogger("my-feature.routers");

create: protectedProcedure
  .input(createInputSchema)
  .mutation(async ({ ctx, input }) => {
    logger.info({ userId: ctx.user.id, name: input.name }, "Creating item");

    try {
      const result = await db.insert(myFeatureTable).values({...});
      logger.info({ id: result.id }, "Item created successfully");
      return result;
    } catch (error) {
      logger.error({ error, userId: ctx.user.id }, "Failed to create item");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create item"
      });
    }
  }),
```

### 3. データベースクエリは効率的に

```typescript
// ❌ 非効率：N+1クエリ
const items = await db.select().from(myTable);
const results = await Promise.all(
  items.map(item => db.select().from(relatedTable).where(...))
);

// ✅ 効率的：JOINを使用
const results = await db
  .select()
  .from(myTable)
  .leftJoin(relatedTable, eq(myTable.id, relatedTable.myTableId));
```

### 4. 所有権確認は一貫して

```typescript
// 常にこのパターンを使用
const resource = await db.query.resourceTable.findFirst({
  where: eq(resourceTable.id, input.id)
});

if (!resource || resource.userId !== ctx.user.id) {
  throw new TRPCError({
    code: "NOT_FOUND",
    message: "Resource not found or unauthorized"
  });
}
```

### 5. 入力バリデーションは徹底的に

```typescript
// Zodスキーマを分割・再利用
const nameValidator = z.string().min(1).max(255);
const emailValidator = z.string().email();
const dateValidator = z.date().or(z.string().datetime());

const createInputSchema = z.object({
  name: nameValidator,
  email: emailValidator,
  startDate: dateValidator,
});
```

### 6. トランザクションを使用

```typescript
// 複数の操作を1つのトランザクションで
mutation: protectedProcedure
  .input(complexInputSchema)
  .mutation(async ({ ctx, input }) => {
    return await db.transaction(async (tx) => {
      // 1. アイテムを作成
      const item = await tx.insert(itemsTable).values({...});

      // 2. 関連データを作成
      await tx.insert(relatedTable).values({...});

      // 3. ログを記録
      await tx.insert(logsTable).values({...});

      return item;
    });
  }),
```

---

## デバッグ・トラブルシューティング

### ログを見る

```bash
# サーバーログ（Docker）
docker compose logs -f app

# 特定のルーターのログだけ
docker compose logs -f app | grep "my-feature.routers"

# 全ログを表示
docker compose logs app --tail 100
```

### 一般的な問題と解決策

**問題**: `NOT_FOUND` エラーが返される
```typescript
// 確認項目
1. リソースが実際に存在するか確認
2. ユーザーIDが一致しているか確認
3. ソフト削除の場合は isDeleted フラグを確認
```

**問題**: バリデーションエラー
```typescript
// Zodエラーメッセージを確認
const schema = z.object({
  email: z.string().email("有効なメールアドレスを入力してください")
});

// エラーが出た場合：
try {
  schema.parse(input);
} catch (error) {
  console.log(error.errors); // 詳細を確認
}
```

**問題**: タイムアウト
```typescript
// データベースクエリが遅い場合
// 1. インデックスを確認（drizzle/schema.ts）
// 2. JOINの方法を最適化
// 3. EXPLAIN QUERYで実行計画を確認

// ブラウザ通信がタイムアウトする場合
// server/routers.ts で fetch-with-timeout を確認
```

### デバッグモード

開発中は詳細なログを出力：

```typescript
// .env
DEBUG=*

// または特定のモジュールのみ
DEBUG=my-feature.routers,db.*
```

---

## まとめ

### チェックリスト

新しいエンドポイントを追加する時：

- [ ] Zodスキーマで入力を定義
- [ ] `protectedProcedure` か `publicProcedure` を選択
- [ ] エラーメッセージを明確に
- [ ] 認可チェック（所有権確認）を実装
- [ ] ロギングを実装
- [ ] ユニットテストを作成
- [ ] API_REFERENCE.mdドキュメントを更新
- [ ] レビューを受ける

---

**関連ドキュメント**:
- [API リファレンス](./API_REFERENCE.md)
- [Drizzle ORM ドキュメント](https://orm.drizzle.team/)
- [tRPC公式ドキュメント](https://trpc.io/)
- [Zod バリデーション](https://zod.dev/)
