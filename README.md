# Brain Diary App

iPhoneからいつでもつぶやける、昔のTwitter風の個人日記Webアプリ。
つぶやきはGitHubの `brain-logs` リポジトリに Markdown ファイルとして自動保存される。

---

## どういうアプリか

スマートフォンから思いついた時に、何度でも日記を投稿できる環境を作るために制作。
サーバーを持たず、ブラウザ ⇔ GitHub API という直接通信で動作する。

**UI のコンセプト**：2010年代初頭のTwitter
- 「いまどうしてる？」のテキストボックス
- 「つぶやく」ボタン
- 今日のタイムライン（時系列表示）

---

## システム構成

```
[iPhoneのSafari]
     ↓ つぶやく
[このWebアプリ (Netlify で公開)]
     ↓ GitHub API (fetch)
[GitHubリポジトリ: brain-logs]
     └── brain/daily/YYYY-MM-DD.md  ← ここに追記される
     
[Macを起動したとき / 1日1回]
     ↓ git pull (LaunchAgentが自動実行)
[ローカルフォルダ: ~/brain/brain/daily/]
```

---

## 関連リポジトリ

| リポジトリ | URL | 役割 |
|---|---|---|
| `brain-daily-app` | https://github.com/sanchu114/brain-daily-app | このアプリのソースコード |
| `brain-logs` | https://github.com/sanchu114/brain-logs | 日記データ（Markdownファイル）の保管 |

---

## 公開URL

**https://poetic-sprite-7db9d5.netlify.app/**

Netlify が `brain-daily-app` の `main` ブランチと連携しており、
`git push` のたびに自動でビルド・デプロイされる。

---

## 初回セットアップ（新しいデバイスで使い始める時）

1. 上記URLをSafariで開く
2. ⚙️（設定）ボタンをタップ
3. GitHub PAT（`repo` スコープのみ）を入力して「保存する」
4. Safariの共有ボタン → 「ホーム画面に追加」でアプリ化

**PATの発行場所**: https://github.com/settings/tokens
- Classic token / `repo` スコープのみチェック / No expiration 推奨

---

## データの保存形式

つぶやくと `brain-logs` リポジトリの `brain/daily/YYYY-MM-DD.md` に以下の形式で追記される：

```markdown
# 2026-02-27 の記録

## 10:30:00
ここに本文が入る。文字数制限なし。

## 14:22:15
2回目のつぶやき。
```

---

## Macへのローカル同期

`~/brain` フォルダが `brain-logs` リポジトリと連携している。
Mac起動時・1日1回、LaunchAgent が自動で `git pull` を実行する。

```
自動同期スクリプト : ~/brain-daily/sync-diary.sh
LaunchAgent plist  : ~/Library/LaunchAgents/com.brain.diary.sync.plist
ログ               : ~/brain/.sync.log
```

**Gitの認証方式**：macOS キーチェーン（PATをURLに平文で書かない安全な方式）
```bash
git config --global credential.helper osxkeychain
```

---

## ファイル構成

```
brain-daily/
├── index.html              # アプリのHTMLの骨格
├── app.js                  # メインロジック（GitHub API通信・UI制御）
├── styles.css              # 昔のTwitter風スタイル（ピュアCSS）
├── vite.config.js          # Viteのビルド設定
├── package.json            # npm設定
├── netlify.toml            # Netlifyのビルド設定（publish: dist）
├── sync-diary.sh           # ~/brain の git pull 自動化スクリプト
├── com.brain.diary.sync.plist  # LaunchAgent設定（1日1回の自動同期）
└── public/
    ├── manifest.json       # PWA設定（ホーム画面アイコン化）
    └── icon.png            # アプリアイコン（羽ペンデザイン）
```

---

## 今後やるかもしれないこと

- [ ] 過去の日記をカレンダー表示する
- [ ] タグ・カテゴリ機能
- [ ] 検索機能
