#!/bin/bash
# brain-logsをGitHubからローカルに自動同期するスクリプト
# Mac起動時 & 1時間おきにLaunchAgentから呼ばれる

BRAIN_DIR="$HOME/brain"
LOG_FILE="$HOME/brain/.sync.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] 同期開始" >> "$LOG_FILE"

cd "$BRAIN_DIR" || { echo "[$(date '+%Y-%m-%d %H:%M:%S')] brain フォルダが見つかりません" >> "$LOG_FILE"; exit 1; }

# GitHubから最新を取得
git pull origin main >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 同期完了" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] 同期失敗（ネットワークかトークンを確認）" >> "$LOG_FILE"
fi
