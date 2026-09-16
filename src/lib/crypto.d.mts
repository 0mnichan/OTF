export function secret(): string;
export function hashPassword(password: string): string;
export function verifyPassword(password: string, stored: string): boolean;
export function randomToken(bytes?: number): string;
export function normalizeAnswer(value: string, caseSensitive?: boolean): string;
export function hashAnswer(normalized: string): string;
export function digestsEqual(a: string, b: string): boolean;
export function dynamicFlag(userId: number | string, questionRef: string, prefix?: string): string;
export function attributeFlag(submitted: string, questionRef: string, candidateUserIds: (number | string)[], prefix?: string): number | string | null;
