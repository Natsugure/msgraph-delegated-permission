import express, { Request, Response } from 'express';
import { getAuthUrl, getTokenFromCode } from './auth';
import { createSubscription } from './graphClient';
import { saveUserToken, addSubscription, getAllUsers } from './db';
import { startRenewalService } from './renewalService';
import { NotificationPayload } from './types';
import { configureAxios } from './config/axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

configureAxios();

/**
 * ホームページ
 */
app.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Microsoft Graph Subscription Demo</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        h1 { color: #0078d4; }
        a { display: inline-block; padding: 10px 20px; background: #0078d4; color: white; text-decoration: none; border-radius: 5px; }
        a:hover { background: #106ebe; }
      </style>
    </head>
    <body>
      <h1>📧 Microsoft Graph Subscription Demo</h1>
      <p>このデモでは、Microsoft Graphのサブスクリプション機能を使用して、受信トレイの変更通知を受け取ります。</p>
      <a href="/auth/signin">🔐 サインインしてサブスクライブ</a>
      <br><br>
      <a href="/status">📊 ステータス確認</a>
    </body>
    </html>
  `);
});

/**
 * サインイン開始
 */
app.get('/auth/signin', async (req: Request, res: Response) => {
  try {
    const authUrl = await getAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('認証URL生成エラー:', error);
    res.status(500).send('認証URLの生成に失敗しました');
  }
});

/**
 * 認証コールバック
 */
app.get('/auth/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  
  if (!code) {
    return res.status(400).send('認証コードがありません');
  }
  
  try {
    // トークンを取得
    const tokenData = await getTokenFromCode(code);
    const userId = tokenData.account.homeAccountId;
    
    // トークンを保存
    saveUserToken(userId, tokenData);
    
    // サブスクリプションを作成
    const subscription = await createSubscription(tokenData.accessToken, userId);
    addSubscription(userId, subscription);
    
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>認証成功</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
          h1 { color: #107c10; }
          .info { background: #f3f2f1; padding: 15px; border-radius: 5px; margin: 10px 0; }
          .info strong { color: #0078d4; }
          a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #0078d4; color: white; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <h1>✅ 認証成功！</h1>
        <div class="info">
          <p><strong>ユーザーID:</strong> ${userId}</p>
          <p><strong>サブスクリプションID:</strong> ${subscription.id}</p>
          <p><strong>有効期限:</strong> ${new Date(subscription.expirationDateTime).toLocaleString('ja-JP')}</p>
        </div>
        <p>✉️ これで受信トレイの変更通知を受信できます。</p>
        <p>📬 自分宛てにメールを送信してテストしてください。</p>
        <a href="/status">📊 ステータス確認</a>
        <a href="/" style="margin-left: 10px; background: #6c757d;">🏠 ホームに戻る</a>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('認証エラー:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラー';
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>認証エラー</title>
      </head>
      <body>
        <h1>❌ 認証に失敗しました</h1>
        <p>エラー: ${errorMessage}</p>
        <a href="/">ホームに戻る</a>
      </body>
      </html>
    `);
  }
});

/**
 * 通知を受信するエンドポイント
 */
app.post('/api/notifications', (req: Request, res: Response) => {
  // 検証リクエスト
  const validationToken = req.query.validationToken as string;
  if (validationToken) {
    console.log('✓ 検証トークンを受信:', validationToken);
    return res.type('text/plain').send(validationToken);
  }
  
  // 実際の通知
  const payload: NotificationPayload = req.body;
  const notifications = payload.value;
  
  console.log('\n📬 通知を受信:', new Date().toISOString());
  console.log(JSON.stringify(notifications, null, 2));
  
  notifications.forEach(notification => {
    console.log(`  📝 変更タイプ: ${notification.changeType}`);
    console.log(`  📂 リソース: ${notification.resource}`);
    console.log(`  🔐 クライアント状態: ${notification.clientState}`);

    // clientStateの検証
    if (notification.clientState !== process.env.CLIENT_STATE_SECRET) {
      console.warn('  ⚠️  無効なclientState');
    }
  });
  
  // 必ず202を返す
  res.status(202).send();
});

/**
 * ステータス確認
 */
app.get('/status', (req: Request, res: Response) => {
  const users = getAllUsers();
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>ステータス確認</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 1000px; margin: 50px auto; padding: 20px; }
        h1 { color: #0078d4; }
        .user-card { background: #f3f2f1; padding: 20px; margin: 20px 0; border-radius: 5px; }
        .user-card h2 { color: #323130; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #0078d4; color: white; }
        .expires-soon { color: #d13438; font-weight: bold; }
        .expires-ok { color: #107c10; }
        a { display: inline-block; margin-top: 20px; padding: 10px 20px; background: #0078d4; color: white; text-decoration: none; border-radius: 5px; }
      </style>
    </head>
    <body>
      <h1>📊 現在のステータス</h1>
      <p>登録ユーザー数: ${users.length}</p>
  `;
  
  if (users.length === 0) {
    html += '<p>まだユーザーが登録されていません。</p>';
  } else {
    users.forEach(user => {
      const tokenExpiry = new Date(user.expiresOn);
      const tokenTimeLeft = tokenExpiry.getTime() - Date.now();
      const tokenMinutesLeft = Math.floor(tokenTimeLeft / 60000);
      const tokenClass = tokenMinutesLeft < 10 ? 'expires-soon' : 'expires-ok';
      
      html += `
        <div class="user-card">
          <h2>👤 ユーザー: ${user.userId}</h2>
          <p><strong>トークン有効期限:</strong> 
            <span class="${tokenClass}">
              ${tokenExpiry.toLocaleString('ja-JP')} 
              (残り約${tokenMinutesLeft}分)
            </span>
          </p>
          <h3>📋 サブスクリプション:</h3>
      `;
      
      if (user.subscriptions.length === 0) {
        html += '<p>サブスクリプションがありません</p>';
      } else {
        html += `
          <table>
            <tr>
              <th>ID</th>
              <th>リソース</th>
              <th>有効期限</th>
              <th>残り時間</th>
            </tr>
        `;
        
        user.subscriptions.forEach(sub => {
          const subExpiry = new Date(sub.expirationDateTime);
          const subTimeLeft = subExpiry.getTime() - Date.now();
          const subHoursLeft = Math.floor(subTimeLeft / 3600000);
          const subClass = subHoursLeft < 1 ? 'expires-soon' : 'expires-ok';
          
          html += `
            <tr>
              <td>${sub.id.substring(0, 8)}...</td>
              <td>${sub.resource}</td>
              <td>${subExpiry.toLocaleString('ja-JP')}</td>
              <td class="${subClass}">約${subHoursLeft}時間</td>
            </tr>
          `;
        });
        
        html += '</table>';
      }
      
      html += '</div>';
    });
  }
  
  html += `
      <a href="/">🏠 ホームに戻る</a>
      <script>
        // 30秒ごとに自動更新
        setTimeout(() => location.reload(), 30000);
      </script>
    </body>
    </html>
  `;
  
  res.send(html);
});

/**
 * ヘルスチェック
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    users: getAllUsers().length
  });
});

/**
 * サーバー起動
 */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('=====================================');
  console.log('🚀 サーバーが起動しました');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🌐 Notification URL: ${process.env.NOTIFICATION_URL}`);
  console.log('=====================================\n');
  
  // 更新サービスを開始
  startRenewalService();
});

// グレースフルシャットダウン
process.on('SIGINT', () => {
  console.log('\n🛑 サーバーをシャットダウンしています...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 サーバーをシャットダウンしています...');
  process.exit(0);
});