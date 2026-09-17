export function googleEnabled(): boolean;
export function redirectUri(requestUrl: string): string;
export function authUrl(requestUrl: string, state: string): string;
export function exchangeCode(requestUrl: string, code: string): Promise<{ googleId: string; email: string; emailVerified: boolean; name: string }>;
