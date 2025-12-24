import { AccountInfo } from '@azure/msal-node';
import { TokenData, UserTokenData, SubscriptionData, Subscription } from './types';

// 簡易的なインメモリストレージ（本番環境ではPostgreSQL/MongoDBなどを使用）
const users = new Map<string, UserTokenData>();

/**
 * ユーザートークンクラス
 */
class UserToken implements UserTokenData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresOn: Date;
  account: AccountInfo;
  subscriptions: SubscriptionData[];

  constructor(
    userId: string,
    accessToken: string,
    refreshToken: string,
    expiresOn: Date,
    account: AccountInfo
  ) {
    this.userId = userId;
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresOn = expiresOn;
    this.account = account;
    this.subscriptions = [];
  }
}

/**
 * ユーザートークンを保存
 */
export function saveUserToken(userId: string, tokenData: TokenData): void {
  const userToken = new UserToken(
    userId,
    tokenData.accessToken,
    tokenData.refreshToken,
    tokenData.expiresOn,
    tokenData.account
  );
  users.set(userId, userToken);
  console.log(`ユーザー ${userId} のトークンを保存しました`);
}

/**
 * ユーザートークンを取得
 */
export function getUserToken(userId: string): UserTokenData | undefined {
  return users.get(userId);
}

/**
 * ユーザートークンを更新
 */
export function updateUserToken(userId: string, tokenData: TokenData): void {
  const user = users.get(userId);
  if (user) {
    user.accessToken = tokenData.accessToken;
    user.refreshToken = tokenData.refreshToken || user.refreshToken;
    user.expiresOn = tokenData.expiresOn;
    console.log(`ユーザー ${userId} のトークンを更新しました`);
  }
}

/**
 * サブスクリプションを追加
 */
export function addSubscription(userId: string, subscription: Subscription): void {
  const user = users.get(userId);
  if (user) {
    user.subscriptions.push({
      id: subscription.id,
      expirationDateTime: subscription.expirationDateTime,
      resource: subscription.resource
    });
    console.log(`ユーザー ${userId} にサブスクリプション ${subscription.id} を追加しました`);
  }
}

/**
 * サブスクリプションを更新
 */
export function updateSubscriptionExpiration(
  userId: string, 
  subscriptionId: string, 
  expirationDateTime: string
): void {
  const user = users.get(userId);
  if (user) {
    const subscription = user.subscriptions.find(sub => sub.id === subscriptionId);
    if (subscription) {
      subscription.expirationDateTime = expirationDateTime;
      console.log(`サブスクリプション ${subscriptionId} の有効期限を更新しました`);
    }
  }
}

/**
 * 全ユーザーを取得
 */
export function getAllUsers(): UserTokenData[] {
  return Array.from(users.values());
}

/**
 * ユーザーを削除
 */
export function deleteUser(userId: string): boolean {
  return users.delete(userId);
}