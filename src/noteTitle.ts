export function noteTitle(content: string, untitled: string) {
  return /[^\s][^\r\n]*/.exec(content)?.[0].trimEnd() || untitled;
}
