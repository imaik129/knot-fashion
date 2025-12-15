# 🚀 サーバー起動ガイド

## クイックスタート

両方のサーバーを起動するには：

```bash
# バックエンドを起動
cd knot-backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 別のターミナルでフロントエンドを起動
cd knot-frontend
npm run dev
```

## 現在の状態

- ✅ **バックエンド:** http://localhost:8000
- ✅ **フロントエンド:** http://localhost:3000
- ✅ **ROMP:** REAL MODE - 準備完了

## アクセス

- **スキャンページ:** http://localhost:3000/scan
- **バックエンドAPI:** http://localhost:8000/

## 停止方法

```bash
# バックエンドを停止
pkill -f "uvicorn main:app"

# フロントエンドを停止
pkill -f "next-server"
```

## トラブルシューティング

### ポートが既に使用されている場合

```bash
# ポート8000を使用しているプロセスを確認
lsof -i :8000

# ポート3000を使用しているプロセスを確認
lsof -i :3000
```

### ログの確認

```bash
# バックエンドのログ
tail -f /tmp/backend.log

# フロントエンドのログ
tail -f /tmp/frontend.log
```
