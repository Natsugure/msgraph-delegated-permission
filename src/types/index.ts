import { AccountInfo } from '@azure/msal-node';

export interface TokenData {
  accessToken: string;
  refreshToken: string; // MSALでは使用しないが互換性のため保持
  expiresOn: Date;
  account: AccountInfo;
}

export interface UserTokenData {
  userId: string;
  accessToken: string;
  refreshToken: string; // MSALでは使用しない
  expiresOn: Date;
  account: AccountInfo;
  subscriptions: SubscriptionData[];
}

export interface SubscriptionData {
  id: string;
  expirationDateTime: string;
  resource: string;
}

export interface Subscription {
  id: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState: string;
}

export interface GraphNotification {
  subscriptionId: string;
  subscriptionExpirationDateTime: string;
  changeType: string;
  resource: string;
  resourceData: {
    '@odata.type': string;
    '@odata.id': string;
    '@odata.etag': string;
    id: string;
  };
  clientState: string;
  tenantId: string;
}

export interface NotificationPayload {
  value: GraphNotification[];
}