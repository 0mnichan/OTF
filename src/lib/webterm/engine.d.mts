export function asciiToRegisters(text: string, count: number): number[];
export function registersToAscii(regs: number[]): string;
export function scenarioExists(id: string): boolean;
export function createWorld(scenarioId: string, opts?: { flags?: Record<string, string> }): any;
export function tick(world: any): void;
export function runCommand(world: any, raw: string): { lines: string[]; clear?: boolean };
