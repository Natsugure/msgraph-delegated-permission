import { AccountInfo } from '@azure/msal-node';

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresOn: Date;
  account: AccountInfo;
}

export interface Subscription {
  id: string;
  resource: string;
  changeType: string;
  notificationUrl: string;
  expirationDateTime: string;
  clientState: string;
}

export interface UserTokenData {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresOn: Date;
  account: AccountInfo;
  subscriptions: SubscriptionData[];
}

export interface SubscriptionData {
  id: string;
  expirationDateTime: string;
  resource: string;
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