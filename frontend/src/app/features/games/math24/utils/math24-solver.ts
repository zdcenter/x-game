import { Math24Card } from '../store/math24.store';

export class Math24Solver {
  /**
   * Tries to find a solution to get 24 from the given cards.
   * Returns an array of step-by-step strings if solvable, or null if no solution.
   * e.g. ["2 + 3 = 5", "5 + 7 = 12", "12 * 2 = 24"]
   */
  static solve(cards: Math24Card[]): string[] | null {
    const nums = cards.map(c => ({ 
      value: c.value, 
      symbol: c.value.toString(), 
      steps: [] as string[] 
    }));
    return this.backtrack(nums);
  }

  private static backtrack(nums: {value: number, symbol: string, steps: string[]}[]): string[] | null {
    if (nums.length === 1) {
      if (Math.abs(nums[0].value - 24) < 0.0001) {
        return nums[0].steps;
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

        // Helper to format step
        const makeStep = (val1: number, sym1: string, val2: number, sym2: string, op: string, res: number) => {
          // Format integers nicely, handle floats if they occur in intermediate steps
          const v1 = Number.isInteger(val1) ? val1.toString() : val1.toFixed(2);
          const v2 = Number.isInteger(val2) ? val2.toString() : val2.toFixed(2);
          const r = Number.isInteger(res) ? res.toString() : res.toFixed(2);
          return `${v1} ${op} ${v2} = ${r}`;
        };

        // Add
        if (i < j) { // commutative, avoid duplicates
            const resVal = a.value + b.value;
            const newStep = makeStep(a.value, a.symbol, b.value, b.symbol, '+', resVal);
            const res = this.backtrack([...nextNums, { 
              value: resVal, 
              symbol: resVal.toString(), 
              steps: [...a.steps, ...b.steps, newStep] 
            }]);
            if (res) return res;
        }

        // Subtract (a - b)
        {
            const resVal = a.value - b.value;
            const newStep = makeStep(a.value, a.symbol, b.value, b.symbol, '-', resVal);
            const res = this.backtrack([...nextNums, { 
              value: resVal, 
              symbol: resVal.toString(), 
              steps: [...a.steps, ...b.steps, newStep] 
            }]);
            if (res) return res;
        }

        // Multiply
        if (i < j) { // commutative
            const resVal = a.value * b.value;
            const newStep = makeStep(a.value, a.symbol, b.value, b.symbol, '×', resVal);
            const res = this.backtrack([...nextNums, { 
              value: resVal, 
              symbol: resVal.toString(), 
              steps: [...a.steps, ...b.steps, newStep] 
            }]);
            if (res) return res;
        }

        // Divide (a / b)
        if (Math.abs(b.value) > 0.0001) {
            const resVal = a.value / b.value;
            const newStep = makeStep(a.value, a.symbol, b.value, b.symbol, '÷', resVal);
            const res = this.backtrack([...nextNums, { 
              value: resVal, 
              symbol: resVal.toString(), 
              steps: [...a.steps, ...b.steps, newStep] 
            }]);
            if (res) return res;
        }
      }
    }
    return null;
  }
}
