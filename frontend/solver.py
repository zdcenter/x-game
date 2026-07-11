import sys

rows = [
    [3, 1, 1],
    [2, 2, 3],
    [5, 3],
    [1, 4, 1, 1],
    [2, 1, 2],
    [2, 4],
    [1, 3, 3],
    [1, 1, 2],
    [2, 1, 1],
    [1, 2, 1],
]

cols = [
    [4, 2, 1],
    [3, 2, 1],
    [1, 3, 1, 1],
    [2, 1, 2],
    [4, 3],
    [2, 1, 1],
    [1, 2, 2],
    [4, 3],
    [2, 5],
    [1, 2],
]

def generate_lines(clues, length=10):
    if not clues:
        yield [0] * length
        return
    c = clues[0]
    rest = clues[1:]
    min_rest = sum(rest) + len(rest)
    for start in range(length - min_rest - c + 1):
        line = [0] * start + [1] * c
        if rest:
            line += [0]
            for tail in generate_lines(rest, length - len(line)):
                yield line + tail
        else:
            yield line + [0] * (length - len(line))

row_possibilities = [list(generate_lines(r)) for r in rows]

board = []
solutions = []

def solve(r):
    if r == 10:
        # Check cols
        for c in range(10):
            col_line = [board[i][c] for i in range(10)]
            blocks = []
            cur = 0
            for val in col_line:
                if val == 1:
                    cur += 1
                elif cur > 0:
                    blocks.append(cur)
                    cur = 0
            if cur > 0:
                blocks.append(cur)
            if blocks != cols[c]:
                return
        solutions.append([list(row) for row in board])
        return

    for poss in row_possibilities[r]:
        # Quick prune: check columns with partial board
        valid = True
        for c in range(10):
            col_line = [board[i][c] for i in range(r)] + [poss[c]]
            # check partial blocks
            blocks = []
            cur = 0
            for val in col_line:
                if val == 1:
                    cur += 1
                elif cur > 0:
                    blocks.append(cur)
                    cur = 0
            # if we have fully completed blocks, they must match the start of col clues
            if cur > 0:
                partial_blocks = blocks + [cur]
            else:
                partial_blocks = blocks
                
            if len(partial_blocks) > len(cols[c]):
                valid = False
                break
            # check completed blocks
            for i in range(len(blocks)):
                if blocks[i] != cols[c][i]:
                    valid = False
                    break
            if not valid: break
            
            # check cur block size
            if cur > 0 and len(blocks) < len(cols[c]):
                if cur > cols[c][len(blocks)]:
                    valid = False
                    break
                    
        if valid:
            board.append(poss)
            solve(r+1)
            board.pop()

solve(0)
print(f"Total solutions: {len(solutions)}")
if solutions:
    for row in solutions[0]:
        print("".join("O" if x else "." for x in row))
