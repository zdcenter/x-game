import re
import itertools
from fractions import Fraction
import random

def solve24(cards):
    def dfs(nums, exprs):
        if len(nums) == 1:
            if nums[0] == 24:
                return [exprs[0]]
            return []
        
        res = []
        for i in range(len(nums)):
            for j in range(len(nums)):
                if i == j: continue
                
                a, b = nums[i], nums[j]
                ea, eb = exprs[i], exprs[j]
                
                nxt_nums = [nums[k] for k in range(len(nums)) if k != i and k != j]
                nxt_exprs = [exprs[k] for k in range(len(exprs)) if k != i and k != j]
                
                # Add
                res.extend(dfs(nxt_nums + [a + b], nxt_exprs + [f"({ea}+{eb})"]))
                # Sub
                res.extend(dfs(nxt_nums + [a - b], nxt_exprs + [f"({ea}-{eb})"]))
                # Mul
                res.extend(dfs(nxt_nums + [a * b], nxt_exprs + [f"({ea}*{eb})"]))
                # Div
                if b != 0:
                    res.extend(dfs(nxt_nums + [a / b], nxt_exprs + [f"({ea}/{eb})"]))
        return res
        
    nums = [Fraction(int(x)) for x in cards]
    exprs = [str(int(x)) for x in cards]
    solutions = set()
    for p_nums, p_exprs in zip(itertools.permutations(nums), itertools.permutations(exprs)):
        solutions.update(dfs(list(p_nums), list(p_exprs)))
    return list(solutions)

def has_fraction_sol(solutions):
    # If any solution requires a fraction step
    # Actually, if ALL solutions require a fraction step, it's a "fraction puzzle"
    # But checking if ANY step has '/' inside the inner parentheses is a good proxy.
    return any('/' in sol for sol in solutions)

def has_paren_sol(solutions):
    # All solutions have parentheses because of how we format them.
    # A puzzle that "requires parentheses" means you can't just do A*B*C*D or A+B+C+D etc sequentially.
    return True

with open('/home/zd/x-game/frontend/src/app/features/games/math24/utils/math24-puzzles.ts', 'r') as f:
    content = f.read()

diff_matches = re.findall(r'(easy|medium|hard):\s*\[(.*?)\]', content, re.DOTALL)
new_puzzles = {}

random.seed(42)

for diff, arr_str in diff_matches:
    puzzles = re.findall(r"'([^']+)'", arr_str)
    
    # Shuffle first as user requested
    random.shuffle(puzzles)
    
    filtered = []
    
    if diff == 'easy':
        filtered = puzzles[:40]
    elif diff == 'medium':
        # Prioritize keeping those with fractions/hard solutions
        frac_puzzles = []
        normal_puzzles = []
        for p in puzzles:
            cards = p.split(',')
            sols = solve24(cards)
            if has_fraction_sol(sols):
                frac_puzzles.append(p)
            else:
                normal_puzzles.append(p)
                
        # We need to keep under 300.
        keep_count = min(300, len(puzzles))
        if len(frac_puzzles) >= keep_count:
            filtered = frac_puzzles[:keep_count]
        else:
            filtered = frac_puzzles + normal_puzzles[:keep_count - len(frac_puzzles)]
            
        random.shuffle(filtered)
    else:
        filtered = puzzles
        
    new_puzzles[diff] = filtered

# Format TS file
ts_content = "export const MATH24_PUZZLES = {\n"
for diff, p_list in new_puzzles.items():
    ts_content += f"  {diff}: [\n"
    for p in p_list:
        ts_content += f"    '{p}',\n"
    ts_content += "  ],\n"
ts_content += "};\n"

with open('/home/zd/x-game/frontend/src/app/features/games/math24/utils/math24-puzzles.ts', 'w') as f:
    f.write(ts_content)

print(f"Easy: {len(new_puzzles['easy'])}")
print(f"Medium: {len(new_puzzles['medium'])}")
print(f"Hard: {len(new_puzzles.get('hard', []))}")
