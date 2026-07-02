#!/usr/bin/env python3
import random
import json
from datetime import datetime, timezone
import os

def get_empty_neighbors(grid, r, c, w, h):
    count = 0
    for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] == 0:
            count += 1
    return count

def generate_partition(w, h, min_len=4):
    for attempt in range(100000):
        grid = [[0]*w for _ in range(h)]
        empty_cells = [(r, c) for r in range(h) for c in range(w)]
        random.shuffle(empty_cells)
        
        color = 1
        paths = {}
        success = True
        
        for sr, sc in empty_cells:
            if grid[sr][sc] != 0:
                continue
                
            path = [(sr, sc)]
            grid[sr][sc] = color
            
            curr_r, curr_c = sr, sc
            # Pick a random target length to force multiple colors
            target_len = random.randint(min_len, min(w*h // 2, min_len + 5))
            
            while len(path) < target_len:
                neighbors = []
                for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
                    nr, nc = curr_r + dr, curr_c + dc
                    if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] == 0:
                        neighbors.append((nr, nc))
                if not neighbors:
                    break
                
                # Warnsdorff's heuristic: prefer neighbors with FEWEST empty neighbors
                neighbors.sort(key=lambda n: get_empty_neighbors(grid, n[0], n[1], w, h))
                min_score = get_empty_neighbors(grid, neighbors[0][0], neighbors[0][1], w, h)
                best_neighbors = [n for n in neighbors if get_empty_neighbors(grid, n[0], n[1], w, h) == min_score]
                
                nr, nc = random.choice(best_neighbors)
                grid[nr][nc] = color
                path.append((nr, nc))
                curr_r, curr_c = nr, nc
                
            if len(path) < min_len:
                success = False
                break
                
            paths[color] = path
            color += 1
            
        if success:
            if all(grid[r][c] != 0 for r in range(h) for c in range(w)):
                endpoints = []
                for c_idx, p in paths.items():
                    endpoints.append({
                        "color": c_idx,
                        "p1": [p[0][1], p[0][0]],
                        "p2": [p[-1][1], p[-1][0]]
                    })
                # Check if we generated at least 2 colors, otherwise it's just a boring snake puzzle
                if len(paths) >= 2:
                    return endpoints
    return None

def has_shortcut_solution(w, h, endpoints, max_steps=5000):
    grid = [[0]*w for _ in range(h)]
    starts = {}
    ends = {}
    colors = []
    for ep in endpoints:
        c = ep["color"]
        colors.append(c)
        grid[ep["p1"][1]][ep["p1"][0]] = c
        grid[ep["p2"][1]][ep["p2"][0]] = c
        starts[c] = (ep["p1"][1], ep["p1"][0])
        ends[c] = (ep["p2"][1], ep["p2"][0])

    shortcut_found = False
    steps = 0

    def backtrack(c_idx, r, c):
        nonlocal shortcut_found, steps
        steps += 1
        if steps > max_steps or shortcut_found:
            return

        if c_idx == len(colors):
            # Check if there are any empty cells
            empty_count = sum(1 for row in range(h) for col in range(w) if grid[row][col] == 0)
            if empty_count > 0:
                shortcut_found = True
            return

        color = colors[c_idx]
        er, ec = ends[color]

        # Fast failure
        for check_c in colors[c_idx:]:
            check_er, check_ec = ends[check_c]
            free_neighbors = sum(1 for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)] 
                               if 0 <= check_er+dr < h and 0 <= check_ec+dc < w 
                               and (grid[check_er+dr][check_ec+dc] == 0 or (check_er+dr == r and check_ec+dc == c and check_c == color)))
            if free_neighbors == 0 and not (check_er == r and check_ec == c and check_c == color):
                return

        for dr, dc in [(-1,0),(1,0),(0,-1),(0,1)]:
            nr, nc = r + dr, c + dc
            if 0 <= nr < h and 0 <= nc < w:
                if nr == er and nc == ec:
                    if c_idx + 1 < len(colors):
                        nr_start, nc_start = starts[colors[c_idx+1]]
                        backtrack(c_idx + 1, nr_start, nc_start)
                    else:
                        backtrack(c_idx + 1, -1, -1)
                elif grid[nr][nc] == 0:
                    grid[nr][nc] = color
                    backtrack(c_idx, nr, nc)
                    grid[nr][nc] = 0

    backtrack(0, starts[colors[0]][0], starts[colors[0]][1])
    return shortcut_found

def generate_levels():
    difficulties = [
        {"id": "easy", "configs": [(5, 5), (6, 6)], "count": 20, "min_len": 3},
        {"id": "medium", "configs": [(7, 7), (8, 8)], "count": 20, "min_len": 4},
        {"id": "hard", "configs": [(9, 9), (10, 10)], "count": 10, "min_len": 5},
        {"id": "expert", "configs": [(11, 11), (12, 12)], "count": 10, "min_len": 6}
    ]
    
    seeds = []
    
    for diff in difficulties:
        diff_id = diff["id"]
        configs = diff["configs"]
        count = diff["count"]
        min_len = diff["min_len"]
        
        print(f"Generating {count} levels for {diff_id}...")
        
        for i in range(1, count + 1):
            w, h = random.choice(configs)
            endpoints = generate_partition(w, h, min_len)
            strict = False
            while not strict:
                if endpoints is not None and len(endpoints) >= 2:
                    if not has_shortcut_solution(w, h, endpoints, max_steps=10000):
                        strict = True
                        break
                endpoints = generate_partition(w, h, min_len)
                
            puzzle_id = f"connect-{diff_id}-{i}"
            puzzle = {
                "id": puzzle_id,
                "difficulty": diff_id,
                "width": w,
                "height": h,
                "endpoints": json.dumps(endpoints),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            seeds.append(puzzle)
            if i % 50 == 0:
                print(f"  {i}/{count} done")
                
    output_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'pkg', 'db', 'connect_seeds.json')
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(seeds, f, indent=2)
        
    print(f"Successfully generated {len(seeds)} puzzles and saved to {output_path}")

if __name__ == "__main__":
    generate_levels()
