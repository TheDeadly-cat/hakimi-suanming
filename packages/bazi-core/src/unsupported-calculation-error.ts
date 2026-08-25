export class UnsupportedCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsupportedCalculationError";
  }
}
