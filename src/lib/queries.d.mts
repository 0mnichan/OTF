export interface RoomRow {
  id: number; slug: string; title: string; summary: string; difficulty: string;
  purdue_levels: number[]; protocols: string[]; attack_ics: string[]; tags: string[];
  points: number; est_minutes: number; author: string; free: boolean; published: boolean;
  order_index: number; lab_spec: any | null; banner: string; hasLab: boolean;
  web_lab: any | null; hasWebLab: boolean;
}
export function listRooms(opts?: { includeUnpublished?: boolean }): RoomRow[];
export function getRoomBySlug(slug: string, opts?: { includeUnpublished?: boolean }): RoomRow | undefined;
export function getRoomTasks(roomId: number): any[];
export function roomPrereqs(roomId: number): { slug: string; title: string }[];
export function listPaths(): any[];
export function getPathBySlug(slug: string): any | null;
export function solvedQuestionIds(userId: number | null, roomId: number): Set<number>;
export function roomStats(): Map<number, { players: number; completions: number }>;
export function platformStats(): { rooms: number; paths: number; players: number; questions: number; labs: number; solves: number };
export function userProfile(username: string): any | null;
