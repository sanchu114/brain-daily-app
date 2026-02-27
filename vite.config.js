import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
    server: {
        host: true,
        port: 5173,
        strictPort: true,
        configureServer(server) {
            // ミドルウェアスタックの先頭に無理やりねじ込む (unshift)
            server.middlewares.stack.unshift({
                handle: (req, res, next) => {
                    const url = req.url || '';

                    // APIへの足跡を全て「エラーログ」として赤文字で表示 (確実に気づくため)
                    if (url.includes('/api/')) {
                        console.error(`\n[CRITICAL DEBUG] API REQUEST DETECTED: ${req.method} ${url}`);
                    }

                    // v4 エンドポイント (キャッシュ回避の最終手段)
                    if (url.includes('/api/save-final-v4') && req.method === 'POST') {
                        console.error('[CRITICAL DEBUG] -> API Hit! Saving to Mac...');
                        let body = '';
                        req.on('data', chunk => { body += chunk.toString(); });
                        req.on('end', () => {
                            try {
                                const data = JSON.parse(body || '{}');
                                const now = new Date();
                                const today = now.toISOString().split('T')[0];
                                const timeStr = now.toLocaleTimeString('ja-JP');
                                const targetDir = '/Users/yamanakashiho/brain/daily';
                                const targetPath = path.join(targetDir, `${today}.md`);

                                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                                const header = `\n\n--- 記録時刻: ${timeStr} ---\n\n`;
                                const content = (data.messages || []).map(m => `${m.role === 'ai' ? '🤖 AI' : '👤 YOU'}: ${m.text}`).join('\n\n');
                                fs.appendFileSync(targetPath, header + content, 'utf8');

                                res.statusCode = 200;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ status: 'success' }));
                                console.error(`[CRITICAL DEBUG] SUCCESS: Saved to ${targetPath}`);
                            } catch (err) {
                                console.error(`[CRITICAL DEBUG] ERROR: ${err.message}`);
                                res.statusCode = 500;
                                res.end(JSON.stringify({ status: 'error', message: err.message }));
                            }
                        });
                        return;
                    }

                    if (url.includes('/api/ping')) {
                        console.error('[CRITICAL DEBUG] -> Ping Hit!');
                        res.statusCode = 200;
                        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                        res.end('PONG (v4-final)');
                        return;
                    }
                    next();
                }
            });
        }
    }
});
