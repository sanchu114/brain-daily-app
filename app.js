// localStorageのキー
const CONFIG_KEY = 'retro_twitter_config';

// 状態
let config = {
    token: '',
    owner: 'sanchu114',
    repo: 'brain-logs',
    path: 'brain/daily'
};
let isSubmitting = false;

// DOM要素
const tweetInput = document.getElementById('tweetInput');
const tweetBtn = document.getElementById('tweetBtn');
const templateBtn = document.getElementById('templateBtn');
const timeline = document.getElementById('timeline');
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const loadingIndicator = document.getElementById('loadingIndicator');

// 初期化
function init() {
    loadConfig();

    // イベントリスナー
    tweetInput.addEventListener('input', handleInput);
    tweetBtn.addEventListener('click', postTweet);
    templateBtn.addEventListener('click', insertTemplate);
    settingsBtn.addEventListener('click', openSettings);
    closeSettingsBtn.addEventListener('click', closeSettings);
    saveSettingsBtn.addEventListener('click', saveSettings);

    // トークンがなければ設定画面を開く
    if (!config.token) {
        openSettings();
    } else {
        // 今日のログを読み込む（オプショナル）
        fetchTodayTimeline();
    }
}

// ---------------------------
// UI操作
// ---------------------------
function handleInput() {
    const text = tweetInput.value;
    tweetBtn.disabled = text.trim() === '';
}

function insertTemplate() {
    const template = `【🌙 今日のふりかえり】
- 昨日の自分へのアンサー：

- 今日一番心に残ったこと：
- なんでそう感じた？：

- 明日ちょっと試してみたいこと：
`;
    // 既存の入力テキストの末尾にテンプレートを追加（空の場合はそのままセット）
    if (tweetInput.value.trim() === '') {
        tweetInput.value = template;
    } else {
        tweetInput.value = tweetInput.value + '\n\n' + template;
    }
    handleInput();
    tweetInput.focus();

    // カーソルを「昨日の自分へのアンサー：」の後に移動させる
    const pos = tweetInput.value.indexOf('昨日の自分へのアンサー：') + '昨日の自分へのアンサー：'.length;
    tweetInput.setSelectionRange(pos, pos);
}

function openSettings() {
    document.getElementById('githubToken').value = config.token;
    document.getElementById('githubOwner').value = config.owner;
    document.getElementById('githubRepo').value = config.repo;
    settingsModal.classList.remove('hidden');
}

function closeSettings() {
    settingsModal.classList.add('hidden');
}

function saveSettings() {
    config.token = document.getElementById('githubToken').value.trim();
    config.owner = document.getElementById('githubOwner').value.trim();
    config.repo = document.getElementById('githubRepo').value.trim();

    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    closeSettings();

    if (config.token) {
        fetchTodayTimeline();
    }
}

function loadConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
        config = { ...config, ...JSON.parse(saved) };
    }
}

function appendTweetToUI(text, timestampStr) {
    const li = document.createElement('li');
    li.classList.add('tweet-item');

    li.innerHTML = `
        <div class="user-avatar">
            <div class="avatar-placeholder">👤</div>
        </div>
        <div class="tweet-content-area">
            <div class="tweet-meta">
                <span class="tweet-user">自分</span>
                <span class="tweet-time">${timestampStr}</span>
            </div>
            <div class="tweet-text">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
        </div>
    `;

    // 最上部に挿入（最新が上）
    timeline.insertBefore(li, timeline.firstChild);
}

function renderTimelineFromMarkdown(markdown) {
    timeline.innerHTML = ''; // クリア

    // 単純なパース。`## HH:MM` などの見出しと本文を抽出する
    // Markdownの構成: 
    // ## 10:00
    // つぶやきテスト

    const parts = markdown.split(/##\s+(\d{1,2}:\d{2}(:\d{2})?)/);

    // 古い順に入っているので、配列としては[本文の前, 時刻, 秒, 本文, 時刻, 秒, 本文...] となる
    const tweets = [];
    for (let i = 1; i < parts.length; i += 3) {
        let time = parts[i];
        let content = parts[i + 2] ? parts[i + 2].trim() : '';
        if (content) {
            tweets.push({ time, content });
        }
    }

    // UIには最新を上に表示したい
    tweets.reverse().forEach(tweet => {
        appendTweetToUI(tweet.content, tweet.time);
    });
}

// ---------------------------
// GitHub API 通信
// ---------------------------

// 共通のFetch関数
async function fetchGitHubAPI(url, method = 'GET', body = null) {
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    const options = { method, headers };
    if (body) {
        options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return response;
}

// yyyy-mm-ddを取得
function getTodayString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

// ファイルを取得（存在しなければnull）
async function getFile(path) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    const res = await fetchGitHubAPI(url);
    if (!res.ok) {
        return null;
    }
    const data = await res.json();
    // Base64デコード（Unicode対応）
    const content = decodeURIComponent(escape(atob(data.content)));
    return {
        sha: data.sha,
        content: content
    };
}

// ファイルを作成・更新
async function createOrUpdateFile(path, content, message, sha = null) {
    const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}`;
    // Unicode対応Base64エンコード
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    const body = {
        message: message,
        content: encodedContent
    };

    if (sha) {
        body.sha = sha;
    }

    const res = await fetchGitHubAPI(url, 'PUT', body);
    if (!res.ok) {
        throw new Error('ファイルの保存に失敗しました');
    }
    return await res.json();
}

// 今日のタイムラインを取得して表示
async function fetchTodayTimeline() {
    if (!config.token) return;

    loadingIndicator.classList.remove('hidden');
    try {
        const today = getTodayString();
        const path = `${config.path}/${today}.md`;

        const file = await getFile(path);
        if (file && file.content) {
            renderTimelineFromMarkdown(file.content);
        } else {
            timeline.innerHTML = '<li style="padding: 16px; color: #8899a6; text-align: center;">今日のつぶやきはまだありません</li>';
        }
    } catch (e) {
        console.error(e);
    } finally {
        loadingIndicator.classList.add('hidden');
    }
}

// つぶやきを送信
async function postTweet() {
    const text = tweetInput.value.trim();
    if (!text || !config.token || isSubmitting) return;

    isSubmitting = true;
    tweetBtn.disabled = true;
    tweetBtn.textContent = '送信中...';
    tweetInput.disabled = true;

    try {
        const now = new Date();
        const todayStr = getTodayString();
        const timeStr = now.toLocaleTimeString('ja-JP', { hour12: false }); // 24H

        const path = `${config.path}/${todayStr}.md`;
        const newEntry = `\n## ${timeStr}\n${text}\n`;

        // 既存ファイルの取得
        const file = await getFile(path);
        let updatedContent = '';
        let sha = null;

        if (file) {
            // 追記
            updatedContent = file.content + newEntry;
            sha = file.sha;
        } else {
            // 新規作成用にMarkdownヘッダーをつける
            updatedContent = `# ${todayStr} の記録\n` + newEntry;
        }

        // 保存（コミット）
        await createOrUpdateFile(
            path,
            updatedContent,
            `Sync: Tweet on ${timeStr}`,
            sha
        );

        // UI更新
        tweetInput.value = '';
        handleInput(); // 文字数リセット
        if (timeline.innerHTML.includes('今日のつぶやきはまだありません')) {
            timeline.innerHTML = '';
        }
        appendTweetToUI(text, timeStr);

    } catch (e) {
        alert('エラーが発生しました: ' + e.message);
        console.error(e);
    } finally {
        isSubmitting = false;
        tweetBtn.textContent = 'つぶやく';
        tweetInput.disabled = false;
        if (tweetInput.value) {
            tweetBtn.disabled = false;
        }
        tweetInput.focus();
    }
}

// 起動
init();
