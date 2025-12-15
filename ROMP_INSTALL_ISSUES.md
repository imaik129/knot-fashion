# ⚠️ ROMPインストールの問題

## 現在の状況

Python 3.11環境でも`simple-romp`と`chumpy`のインストールに失敗しています。

### 問題点

1. **simple-romp**: ビルド環境内でCythonが見つからない
2. **chumpy**: ビルド環境内でpipが見つからない

これらはpipのビルド分離環境の問題です。

## 現在の動作状態

- ✅ **バックエンド**: MOCK MODEで動作中
- ✅ **フロントエンド**: 正常に動作
- ✅ **3Dビューア**: ダミーデータで動作
- ❌ **実際のAI処理**: ROMPがインストールできていない

## 解決策のオプション

### オプション1: 手動インストール（推奨）

以下のコマンドを手動で実行してください：

```bash
cd knot-backend
source .venv/bin/activate  # Python 3.11環境の場合

# ビルド依存関係をインストール
pip install --upgrade pip setuptools wheel Cython numpy

# simple-rompをインストール（ビルドエラーが出る可能性があります）
pip install simple-romp

# エラーが出た場合、以下を試す：
pip install --no-cache-dir simple-romp
```

### オプション2: 既存のPython 3.13環境で継続

現在、MOCK MODEで動作しているので、フロントエンドと3Dビューアのテストは可能です。

### オプション3: Dockerコンテナを使用

ROMPが動作するDockerイメージを使用する方法もあります。

## 次のステップ

1. **今すぐ**: MOCK MODEでフロントエンドをテスト
2. **後で**: ROMPのインストール問題を解決

MOCK MODEでも以下が動作します：
- ビデオアップロード
- 3Dメッシュ表示（ダミーデータ）
- ビデオオーバーレイ
- UI/UXのテスト


