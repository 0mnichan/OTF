export const MAX_CONCURRENT_PER_USER: number;
export function orchestratorConfigured(): boolean;
export function activeLabForRoom(userId: number, roomId: number): any;
export function anyActiveLab(userId: number): any;
export function startLab(userId: number, room: any): Promise<{ ok: boolean; error?: string; instance?: any }>;
export function refreshLab(userId: number, roomId: number): Promise<any>;
export function stopLab(userId: number, roomId: number): Promise<{ ok: boolean; instance: any }>;
export function extendLab(userId: number, roomId: number, minutes?: number): Promise<{ ok: boolean; error?: string; instance?: any }>;
