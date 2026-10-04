export interface Entry {
  readonly rank: number;
  readonly title: string;
  readonly points: number;
  readonly comments: number;
}

export interface CountedEntry extends Entry {
  readonly wordCount: number;
}
