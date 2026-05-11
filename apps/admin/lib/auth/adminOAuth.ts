type AdminOAuthEnv = {
  [key: string]: string | undefined;
  ADMIN_OAUTH_CLIENT_KEY?: string;
  ADMIN_OAUTH_CLIENT_SECRET?: string;
};

export type AdminOAuthCredentials = {
  username: string;
  password: string;
};

export function createAdminOAuthBasicAuthorizationHeader(credentials: AdminOAuthCredentials): string {
  return `Basic ${Buffer.from(`${credentials.username}:${credentials.password}`, "utf8").toString("base64")}`;
}

export function getAdminOAuthCredentials(env: AdminOAuthEnv = process.env): AdminOAuthCredentials {
  const username = env.ADMIN_OAUTH_CLIENT_KEY?.trim();
  const password = env.ADMIN_OAUTH_CLIENT_SECRET?.trim();

  if (!username || !password) {
    throw new Error("Admin OAuth client credentials are not configured.");
  }

  return {
    username,
    password,
  };
}

export function getAdminOAuthBasicAuthorizationHeader(env: AdminOAuthEnv = process.env): string {
  return createAdminOAuthBasicAuthorizationHeader(getAdminOAuthCredentials(env));
}
