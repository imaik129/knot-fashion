# 🤖 3D人体メッシュ推定モデル設定

## 現在の実装

このバックエンドは**ROMP**と**BEV**の両方をサポートしています。

### デフォルト: ROMP
- ✅ 既に実装済み・動作確認済み
- ✅ 安定した動作
- ✅ 仕立て用途に十分な精度

### オプション: BEV (Body Estimation in the Wild)
- 🆕 より新しいモデル（2023-2024）
- 🎯 ROMPより正確な身体形状推定
- ⚠️ 現在は実装準備中（BEVのインストールが必要）

---

## モデルの切り替え

### ROMPを使用（デフォルト）
```bash
# 環境変数を設定しない、または false に設定
cd knot-backend
.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### BEVを使用（将来の実装）
```bash
# BEVをインストール（実装準備中）
# pip install git+https://github.com/Arthur151/BEV.git

# 環境変数を設定してBEVを使用
USE_BEV=true .venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

---

## BEVの実装方法（将来）

BEVを実装するには：

1. **BEVをインストール**
   ```bash
   cd knot-backend
   source .venv/bin/activate
   pip install git+https://github.com/Arthur151/BEV.git
   ```

2. **BEVのAPIを確認**
   - BEVのGitHubリポジトリでAPIドキュメントを確認
   - `main.py`のBEV初期化部分を調整

3. **環境変数を設定**
   ```bash
   export USE_BEV=true
   ```

4. **テスト**
   - ビデオをアップロードしてBEVが動作するか確認

---

## 現在の推奨

**ROMPを継続使用**を推奨します。

理由:
- ✅ 既に動作している
- ✅ 仕立て用途に十分な精度
- ✅ 安定した動作
- ✅ BEVの実装が完了するまで待つ

BEVは将来的により正確な結果を提供する可能性がありますが、現在はROMPで十分です。

---

## モデル比較

| 特徴 | ROMP | BEV |
|------|------|-----|
| リリース年 | 2022 | 2023-2024 |
| 精度 | 良好 | より正確 |
| 実装状況 | ✅ 完了 | ⚠️ 準備中 |
| 安定性 | ✅ 高い | ⚠️ 未確認 |
| 推奨 | ✅ 現在 | 🆕 将来 |

---

## トラブルシューティング

### ROMPが動作しない場合
1. `simple_romp`がインストールされているか確認
2. SMPLモデルファイルが`~/.romp/`に存在するか確認
3. バックエンドのログを確認

### BEVを試す場合
1. BEVのGitHubリポジトリを確認
2. インストール手順に従う
3. `main.py`のBEV初期化部分を調整
4. テストして動作を確認


