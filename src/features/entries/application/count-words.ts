export function countWords(title: string): number {
  const words = title.split(/\s+/u);
  const validWords = words.filter((word) => /[\p{L}\p{N}]/u.test(word));

  return validWords.length;
}
