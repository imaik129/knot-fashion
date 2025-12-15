# 🚀 サーバー再起動コマンド

## すべてのプロセスを停止

```bash
# すべてのサーバーを停止
pkill -f "uvicorn main:app"
pkill -f "next-server"
pkill -f "node.*3000"
```

または、すべてを一度に停止：

```bash
pkill -f "uvicorn main:app" && pkill -f "next-server" && pkill -f "node.*3000"
```

## バックエンドを起動

**ターミナル1で実行：**

```bash
cd ~/Desktop/knot-fashion/knot-backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**または、バックグラウンドで実行：**

```bash
cd ~/Desktop/knot-fashion/knot-backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
```

## フロントエンドを起動

**ターミナル2で実行：**

```bash
cd ~/Desktop/knot-fashion/knot-frontend
npm run dev
```

**または、バックグラウンドで実行：**

```bash
cd ~/Desktop/knot-fashion/knot-frontend
npm run dev > /tmp/frontend.log 2>&1 &
```

## クイックスタート（すべてを一度に）

```bash
# 1. すべてのプロセスを停止
pkill -f "uvicorn main:app" && pkill -f "next-server" && pkill -f "node.*3000"

# 2. バックエンドを起動（バックグラウンド）
cd ~/Desktop/knot-fashion/knot-backend
source .venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &

# 3. フロントエンドを起動（バックグラウンド）
cd ~/Desktop/knot-fashion/knot-frontend
npm run dev > /tmp/frontend.log 2>&1 &

# 4. 状態を確認
sleep 5
echo "Backend:" && curl -s http://localhost:8000/ && echo ""
echo "Frontend:" && curl -s http://localhost:3000 > /dev/null && echo "✅ Running" || echo "⏳ Starting..."
```

## 状態確認

```bash
# バックエンドの状態
curl http://localhost:8000/

# フロントエンドの状態
curl http://localhost:3000/ > /dev/null && echo "✅ Running" || echo "❌ Not running"

# プロセスの確認
ps aux | grep -E "uvicorn|next-server" | grep -v grep
```

## ログの確認

```bash
# バックエンドのログ
tail -f /tmp/backend.log

# フロントエンドのログ
tail -f /tmp/frontend.log
```

## トラブルシューティング

### ポートが使用されている場合

```bash
# ポート8000を使用しているプロセスを確認
lsof -i :8000

# ポート3000を使用しているプロセスを確認
lsof -i :3000

# プロセスを強制終了
kill -9 <PID>
```

### 仮想環境がアクティブでない場合

```bash
cd ~/Desktop/knot-fashion/knot-backend
source .venv/bin/activate
```

### 依存関係がインストールされていない場合

```bash
# バックエンド
cd ~/Desktop/knot-fashion/knot-backend
source .venv/bin/activate
pip install -r requirements.txt  # もしあれば

# フロントエンド
cd ~/Desktop/knot-fashion/knot-frontend
npm install
```


