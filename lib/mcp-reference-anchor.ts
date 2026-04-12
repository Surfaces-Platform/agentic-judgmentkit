export type CommandKind = "tool" | "prompt";

export function createCommandAnchor(kind: CommandKind, name: string) {
  return `${kind}-${name}`;
}
