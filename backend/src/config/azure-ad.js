import dotenv from 'dotenv';
dotenv.config();

export const azureAdConfig = {
  auth: {
    clientId: process.env.AZURE_AD_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.AZURE_AD_CLIENT_SECRET || 'your-client-secret',
    authority: process.env.AZURE_AD_AUTHORITY || 'https://login.microsoftonline.com/common',
    redirectUri: process.env.AZURE_AD_REDIRECT_URI || 'http://localhost:4000/api/auth/callback',
    tenantId: process.env.AZURE_AD_TENANT_ID || 'common'
  },
  scopes: [
    'User.Read',
    'User.ReadBasic.All',
    'Calendars.ReadWrite',
    'Team.ReadBasic.All',
    'Channel.ReadBasic.All',
    'Files.Read.All',
    'Sites.Read.All',
    'offline_access'
  ],
  graph: {
    baseUrl: 'https://graph.microsoft.com/v1.0',
    betaUrl: 'https://graph.microsoft.com/beta'
  }
};

export const teamsAppConfig = {
  appId: process.env.TEAMS_APP_ID || 'your-teams-app-id',
  appPassword: process.env.TEAMS_APP_PASSWORD || 'your-teams-app-password',
  manifestVersion: '1.16',
  validDomains: [
    process.env.APP_DOMAIN || 'localhost:5173',
    'token.botframework.com',
    'login.microsoftonline.com'
  ],
  webApplicationInfo: {
    id: process.env.AZURE_AD_CLIENT_ID,
    resource: `api://${process.env.APP_DOMAIN}/${process.env.AZURE_AD_CLIENT_ID}`
  }
}; 