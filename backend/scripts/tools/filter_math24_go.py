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
                res.extend(dfs(nxt_nums + [a + b], nxt_exprs + [f"({ea}+{eb})"]))
                res.extend(dfs(nxt_nums + [a - b], nxt_exprs + [f"({ea}-{eb})"]))
                res.extend(dfs(nxt_nums + [a * b], nxt_exprs + [f"({ea}*{eb})"]))
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
    return any('/' in sol for sol in solutions)

with open('/home/zd/x-game/backend/pkg/db/postgres_math24.go', 'r') as f:
    lines = f.readlines()

new_lines = []
puzzles_by_diff = {'Easy': [], 'Medium': [], 'Hard': []}
collecting = False

for line in lines:
    m = re.search(r'ID:\s*".*?",\s*Difficulty:\s*domain\.Math24Difficulty(Easy|Medium|Hard),\s*Cards:\s*"([^"]+)"', line)
    if m:
        diff = m.group(1)
        cards = m.group(2)
        puzzles_by_diff[diff].append(cards)
    elif 'puzzles := []domain.Math24Puzzle{' in line:
        collecting = True
        new_lines.append(line)
    elif collecting and '}' in line and 'DB.CreateInBatches' in ''.join(lines[lines.index(line):]):
        collecting = False
        
random.seed(42)

for diff in ['Easy', 'Medium', 'Hard']:
    puzzles = puzzles_by_diff[diff]
    random.shuffle(puzzles)
    
    filtered = []
    if diff == 'Easy':
        filtered = puzzles[:40]
    elif diff == 'Medium':
        frac_puzzles = []
        normal_puzzles = []
        for p in puzzles:
            cards = p.split(',')
            sols = solve24(cards)
            if has_fraction_sol(sols):
                frac_puzzles.append(p)
            else:
                normal_puzzles.append(p)
        keep_count = min(300, len(puzzles))
        if len(frac_puzzles) >= keep_count:
            filtered = frac_puzzles[:keep_count]
        else:
            filtered = frac_puzzles + normal_puzzles[:keep_count - len(frac_puzzles)]
        random.shuffle(filtered)
    else:
        filtered = puzzles
    puzzles_by_diff[diff] = filtered

# Rewrite the Go code
go_code = """package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedMath24() {
	var count int64
	DB.Model(&domain.Math24Puzzle{}).Count(&count)
	if count == 0 {
		puzzles := []domain.Math24Puzzle{
"""

for diff in ['Easy', 'Medium', 'Hard']:
    for i, p in enumerate(puzzles_by_diff[diff]):
        pid = f"m24-{diff.lower()}-{i+1}"
        go_code += f'\t\t\t{{ID: "{pid}", Difficulty: domain.Math24Difficulty{diff}, Cards: "{p}"}},\n'

go_code += """		}
		
		DB.CreateInBatches(puzzles, 100)
		log.Println("Seeded Math24 puzzles")
	}
}
"""

with open('/home/zd/x-game/backend/pkg/db/postgres_math24.go', 'w') as f:
    f.write(go_code)

print("Done")
