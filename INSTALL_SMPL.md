# 📥 SMPLモデルインストールガイド

## ステップ1: SMPLモデルをダウンロード

1. **SMPL公式サイトにアクセス**
   - URL: https://smpl.is.tue.mpg.de/
   - アカウントを作成（無料）

2. **モデルをダウンロード**
   - "SMPL for Python" → Version 1.1.0 を選択
   - ダウンロードリンクをクリック
   - ZIPファイルをダウンロード（例: `SMPL_python_v.1.1.0.zip`）

## ステップ2: ファイルを抽出

```bash
# ダウンロードフォルダに移動
cd ~/Downloads

# ZIPファイルを展開
unzip SMPL_python_v.1.1.0.zip

# 中身を確認
ls -la SMPL_python_v.1.1.0/
```

## ステップ3: SMPLモデルファイルを配置

```bash
# .rompディレクトリを作成（存在しない場合）
mkdir -p ~/.romp

# SMPLモデルファイルをコピー
# ファイル名は実際のファイル名に合わせてください
cp ~/Downloads/SMPL_python_v.1.1.0/smpl/models/basicModel_neutral_lbs_10_207_0_v1.1.0.pkl ~/.romp/SMPL_NEUTRAL.pth

# オプション: 男性・女性モデルもコピー（同じファイルでOK）
cp ~/.romp/SMPL_NEUTRAL.pth ~/.romp/SMPL_MALE.pth
cp ~/.romp/SMPL_NEUTRAL.pth ~/.romp/SMPL_FEMALE.pth

# 確認
ls -lh ~/.romp/SMPL_*.pth
```

## ステップ4: バックエンドを再起動

```bash
cd knot-backend

# 既存のサーバーを停止（Ctrl+C）

# 再起動
.venv/bin/uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## ステップ5: 動作確認

1. バックエンドのログを確認
   - "ROMP model initialized successfully." が表示されることを確認
   - "MOCK MODE" の警告が出ないことを確認

2. フロントエンドでテスト
   - ビデオをアップロード
   - "MOCK MODE" ではなく、実際のAI処理が行われることを確認

## トラブルシューティング

### ファイルが見つからない場合

```bash
# ファイルの場所を確認
find ~/Downloads -name "*basicModel*" -o -name "*SMPL*.pkl"

# または、展開されたフォルダ内を検索
find ~/Downloads/SMPL* -name "*.pkl" -type f
```

### パーミッションエラーの場合

```bash
# 書き込み権限を確認
ls -ld ~/.romp

# 権限を修正（必要に応じて）
chmod 755 ~/.romp
```

### ROMPがまだMOCK MODEの場合

1. バックエンドのログを確認
   - `SMPL_NEUTRAL.pth` が見つからないというエラーが出ていないか確認

2. ファイルパスを確認
   ```bash
   ls -lh ~/.romp/SMPL_NEUTRAL.pth
   ```

3. ファイル形式を確認
   - `.pth` または `.pkl` 拡張子であることを確認
   - ファイルサイズが約5-10MB程度であることを確認

## 期待される結果

インストールが成功すると：
- ✅ バックエンドログに "ROMP model initialized successfully." が表示される
- ✅ "MOCK MODE" の警告が出なくなる
- ✅ 実際のAI処理が行われる（処理時間が長くなる）
- ✅ より正確な3Dメッシュが生成される
- ✅ SMPL facesが正しく取得される

## 参考リンク

- SMPL公式サイト: https://smpl.is.tue.mpg.de/
- ROMP GitHub: https://github.com/Arthur151/ROMP
- ROMP技術ブログ: https://www.12-technology.com/2022/01/romp-ai3d.html


