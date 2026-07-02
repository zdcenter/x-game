import random

def get_empty_neighbors(grid, r, c, w, h):
    count = 0
    for dr, dc in [(-1,0), (1,0), (0,-1), (0,1)]:
        nr, nc = r + dr, c + dc
        if 0 <= nr < h and 0 <= nc < w and grid[nr][nc] == 0:
            count += 1
    return count

def generate_partition(w, h, min_len=4):
    for attempt in range(10000):
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
                
                # Sort neighbors by the number of their empty neighbors (ascending)
                # This makes the path hug walls and avoid leaving holes
                neighbors.sort(key=lambda n: get_empty_neighbors(grid, n[0], n[1], w, h))
                
                # Pick among the ones with the minimum score
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
                return paths
    return None

p = generate_partition(12, 12, 5)
if p: print("12x12 SUCCESS!")
else: print("12x12 FAILED")

