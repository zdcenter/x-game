export class PRNG {
  private state: number;

  constructor(seed: number) {
    this.state = seed ? seed : Math.random() * 1000000;
  }

  next(): number {
    this.state = (this.state * 9301 + 49297) % 233280;
    return this.state / 233280;
  }
}
