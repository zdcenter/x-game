import random

def generate_partition(w, h, min_len=3):
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
            while True:
                neighbors = []
                for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
                    nr, nc = curr_r + dr, curr_c + dc
                    if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] == 0:
                        neighbors.append((nr, nc))
                if not neighbors:
                    break
                # pick random neighbor
                nr, nc = random.choice(neighbors)
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
                return paths
    return None

paths = generate_partition(12, 12, 4)
if paths:
    print(f"Generated 12x12 with {len(paths)} paths.")
else:
    print("Failed to generate 12x12.")
