# 🔧 ROMP手動インストール手順

## 現在の状況

Python 3.11環境は作成されましたが、`simple-romp`と`chumpy`のインストールにビルド環境の問題があります。

## 手動インストール手順

### 1. 仮想環境をアクティベート

```bash
cd knot-backend
source .venv/bin/activate
```

### 2. 必要なパッケージを確認

```bash
python --version  # Python 3.11.x であることを確認
pip list | grep -E "(torch|numpy|scipy|opencv)"
```

### 3. simple-rompをインストール（複数の方法を試す）

**方法A: 通常のインストール**
```bash
pip install simple-romp
```

**方法B: キャッシュなしでインストール**
```bash
pip install --no-cache-dir simple-romp
```

**方法C: ビルド分離を無効化**
```bash
pip install --no-build-isolation simple-romp
```

**方法D: 開発モードでインストール**
```bash
git clone https://github.com/Arthur151/ROMP.git /tmp/ROMP
cd /tmp/ROMP
pip install -e .
```

### 4. chumpyをインストール

```bash
pip install chumpy --no-build-isolation
```

### 5. 動作確認

```bash
python -c "import romp; print('✅ ROMP imported successfully')"
python test_romp.py
```

## トラブルシューティング

### エラー: "No module named 'Cython'"
```bash
pip install Cython
pip install simple-romp
```

### エラー: "No space left on device"
```bash
# ディスク容量を確認
df -h

# 不要なファイルを削除
pip cache purge
```

### エラー: "Invalid magic number"
SMPLファイルの読み込み問題です。Python 3.11では通常動作するはずです。

## 現在の代替案

MOCK MODEでも以下が動作します：
- ✅ ビデオアップロード
- ✅ 3Dメッシュ表示（ダミーデータ）
- ✅ フロントエンドのテスト

実際のAI処理が必要な場合は、上記の手順でROMPをインストールしてください。


