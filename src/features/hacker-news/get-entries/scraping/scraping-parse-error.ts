export class ScrapingParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScrapingParseError";
  }
}
