export const CONTENT_DIR: string;
export function parseFrontmatter(text: string): { data: any; body: string };
export function loadRoom(dir: string): any;
export function loadAllRooms(): any[];
export function loadAllPaths(): any[];
export function validateContent(): { rooms: any[]; paths: any[]; errors: string[] };
export function syncContent(opts?: { quiet?: boolean }): { rooms: number; paths: number };
