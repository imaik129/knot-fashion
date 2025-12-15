# 🔧 ROMPを実際に動作させる方法

## 現在の問題

- **Python 3.13** では、Python 2形式のpickleファイル（SMPLモデル）を読み込めない
- ROMPの初期化に失敗し、MOCK MODEで動作している

## 解決策: Python 3.11を使用

### ステップ1: Python 3.11をインストール（まだの場合）

```bash
# Homebrewでインストール
brew install python@3.11
```

### ステップ2: 新しい仮想環境を作成

```bash
cd knot-backend

# 既存の仮想環境をバックアップ（必要に応じて）
mv .venv .venv.backup

# Python 3.11で新しい仮想環境を作成
python3.11 -m venv .venv

# アクティベート
source .venv/bin/activate
```

### ステップ3: 依存関係をインストール

```bash
pip install --upgrade pip
pip install fastapi uvicorn[standard] python-multipart
pip install opencv-python-headless numpy scipy
pip install simple-romp chumpy
```

### ステップ4: バックエンドを再起動

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### ステップ5: 確認

ログに以下が表示されれば成功：
```
INFO:main:ROMP model initialized successfully.
```

MOCK MODEの警告が出なければ、実際のAI処理が動作しています。

## 現在の状態（Python 3.13）

- ✅ バックエンドは起動している
- ✅ MOCK MODEでダミーデータを返している
- ❌ 実際のROMP AI処理は動作していない

## 注意

Python 3.11環境に切り替えると、実際のAI処理が動作しますが、処理時間が長くなります（数秒〜数十秒）。


