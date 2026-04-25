import { randomUUID } from "node:crypto";

export function makeAtomicTempPath(targetPath: string): string {
  return `${targetPath}.${process.pid}.${randomUUID()}.tmp`;
}
