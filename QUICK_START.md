# ⚡ クイックスタートガイド

## ステップ1: バックエンドを起動

新しいターミナルウィンドウを開いて：

```bash
cd /Users/kyosuke912/Desktop/knot-fashion/knot-backend
.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**確認:**
- ✅ "ROMP models appear to be present." が表示される
- ✅ "ROMP model initialized successfully." が表示される
- ❌ "MOCK MODE" の警告が出ない

---

## ステップ2: フロントエンドを起動

別のターミナルウィンドウを開いて：

```bash
cd /Users/kyosuke912/Desktop/knot-fashion/knot-frontend
npm run dev
```

**確認:**
- ✅ "Ready" メッセージが表示される
- ✅ http://localhost:3000 でアクセス可能

---

## ステップ3: ブラウザで開く

1. ブラウザで `http://localhost:3000/scan` を開く
2. ビデオをアップロード
3. "Generate 3D Mesh" ボタンをクリック
4. 3Dメッシュが生成されるのを待つ

---

## 期待される結果

✅ **MOCK MODEではない:**
- "Processed successfully (MOCK MODE...)" ではなく
- "Processed successfully (X/Y frames detected, exponentially smoothed)" と表示される

✅ **実際のAI処理:**
- 処理に数秒〜数十秒かかる
- より正確な3Dメッシュが生成される
- SMPL facesが正しく取得される

✅ **ビデオオーバーレイ:**
- ビデオの上に半透明の3Dメッシュが表示される
- 滑らかなメッシュ表示

---

## トラブルシューティング

### バックエンドが起動しない
```bash
# ポート8000が使用中の場合
lsof -ti:8000 | xargs kill -9

# 再起動
cd knot-backend
.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンドが起動しない
```bash
# ポート3000が使用中の場合
lsof -ti:3000 | xargs kill -9

# 再起動
cd knot-frontend
npm run dev
```

### まだMOCK MODEが表示される
```bash
# SMPLファイルを確認
ls -lh ~/.romp/SMPL_NEUTRAL.pth

# バックエンドを再起動
# (Ctrl+Cで停止してから再起動)
```


