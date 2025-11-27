# Technology Stack

## Architecture

**Backend**: Hono フレームワークによる REST API サーバー (OpenAPI 対応)  
**Frontend**: Nuxt 3 SPA (SSR 無効)  
**Monorepo**: `backend/` と `frontend/` の独立パッケージ構成

## Core Technologies

- **Language**: TypeScript (ES Modules)
- **Backend Framework**: Hono + @hono/zod-openapi
- **Frontend Framework**: Nuxt 3 + Vue 3
- **Runtime**: Node.js (ESNext target)
- **Bundler**: Rolldown (backend), Nuxt (frontend)

## Key Libraries

| 領域 | ライブラリ |
|------|-----------|
| API Schema | Zod + @hono/zod-openapi |
| API Docs | @scalar/hono-api-reference |
| Styling | Tailwind CSS |
| Testing | Vitest |
| Type-safe Client | hono/client (hc) |

## Development Standards

### Type Safety

- TypeScript strict mode 有効
- `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` 有効
- `any` 型の使用禁止

### Code Quality

- **Linter**: ESLint (typescript-eslint, unicorn, jsdoc, import-x)
- **Formatter**: Prettier
- **静的解析コマンド**: `npm run fix` (format + lint + type check)

### Testing

- **Framework**: Vitest
- **コロケーション**: テストファイルは実装と同一ディレクトリ (`*.test.ts`)
- **命名**: 説明文は日本語

### Documentation

- JSDoc コメントは日本語
- 公開関数には `@param`, `@returns` を記述

## Development Environment

### Required Tools

- Node.js (LTS 推奨)
- npm

### Common Commands

```bash
# Backend
cd backend && npm install && npm run dev   # Dev server (port 3000)
npm run fix                                 # Format + Lint + Type check
npm run test                                # Run tests

# Frontend
cd frontend && npm install && npm run dev  # Nuxt dev server
npm run fix                                 # Format + Lint + Type check
```

## Key Technical Decisions

| 決定事項 | 理由 |
|---------|------|
| Hono + OpenAPI | 軽量かつ型安全な API 設計 |
| SSE (Server-Sent Events) | WebSocket より軽量なリアルタイム配信 |
| In-Memory Store | シンプルなゲーム状態管理、外部 DB 不要 |
| Nuxt SPA モード | フロントエンドの軽量化、静的ホスティング対応 |
| hc (hono/client) | バックエンド API の型を共有 |

---
_Document standards and patterns, not every dependency_
