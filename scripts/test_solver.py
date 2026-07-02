def solve_unique(w, h, endpoints, max_steps=5000):
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

    solutions = 0
    steps = 0

    def backtrack(c_idx, r, c):
        nonlocal solutions, steps
        steps += 1
        if steps > max_steps:
            return

        if c_idx == len(colors):
            solutions += 1
            return

        color = colors[c_idx]
        er, ec = ends[color]

        # Fast failure: check if any end is completely blocked
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
                    # Move to next color
                    if c_idx + 1 < len(colors):
                        nr_start, nc_start = starts[colors[c_idx+1]]
                        backtrack(c_idx + 1, nr_start, nc_start)
                    else:
                        backtrack(c_idx + 1, -1, -1)
                elif grid[nr][nc] == 0:
                    grid[nr][nc] = color
                    backtrack(c_idx, nr, nc)
                    grid[nr][nc] = 0
                    
        if solutions >= 2:
            return

    backtrack(0, starts[colors[0]][0], starts[colors[0]][1])
    return solutions

print(solve_unique(6, 6, endpoints2))
