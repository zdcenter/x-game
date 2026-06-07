import { Math24Card } from '../store/math24.store';

export class Math24Solver {
  /**
   * Tries to find a solution to get 24 from the given cards.
   * Returns a complete expression string if solvable, or null if no solution.
   */
  static solve(cards: Math24Card[]): string | null {
    const nums = cards.map(c => ({ value: c.value, exp: c.expression }));
    return this.backtrack(nums);
  }

  private static backtrack(nums: {value: number, exp: string}[]): string | null {
    if (nums.length === 1) {
      if (Math.abs(nums[0].value - 24) < 0.0001) {
        return nums[0].exp;
      }
      return null;
    }

    for (let i = 0; i < nums.length; i++) {
      for (let j = 0; j < nums.length; j++) {
        if (i === j) continue;
        
        const nextNums = [];
        for (let k = 0; k < nums.length; k++) {
          if (k !== i && k !== j) {
            nextNums.push(nums[k]);
          }
        }

        const a = nums[i];
        const b = nums[j];

        // Add
        if (i < j) { // commutative, avoid duplicates
            let res = this.backtrack([...nextNums, { value: a.value + b.value, exp: `(${a.exp} + ${b.exp})` }]);
            if (res) return res;
        }

        // Subtract (a - b)
        let res = this.backtrack([...nextNums, { value: a.value - b.value, exp: `(${a.exp} - ${b.exp})` }]);
        if (res) return res;

        // Multiply
        if (i < j) { // commutative
            res = this.backtrack([...nextNums, { value: a.value * b.value, exp: `(${a.exp} * ${b.exp})` }]);
            if (res) return res;
        }

        // Divide (a / b)
        if (Math.abs(b.value) > 0.0001) {
            res = this.backtrack([...nextNums, { value: a.value / b.value, exp: `(${a.exp} / ${b.exp})` }]);
            if (res) return res;
        }
      }
    }
    return null;
  }
}
