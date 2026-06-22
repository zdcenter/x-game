package covergen

import (
	"fmt"
	"strings"
)

// ── Sudoku ───────────────────────────────────────────────────────────────────

func sudokuBoard(acc1, _ string) string {
	const cs = 33 // cell size
	const n = 9
	const total = cs * n // 297
	const off = -total / 2

	// Filled cells: row, col, number
	filled := [][3]int{
		{0, 0, 5}, {0, 1, 3}, {0, 4, 7},
		{1, 0, 6}, {1, 3, 1}, {1, 4, 9}, {1, 5, 5},
		{2, 1, 9}, {2, 7, 6},
		{3, 0, 8}, {3, 4, 6},
		{4, 0, 4}, {4, 4, 8}, {4, 8, 3},
		{5, 4, 2}, {5, 8, 6},
		{6, 1, 6}, {6, 6, 2},
		{7, 4, 1}, {7, 7, 4},
		{8, 2, 8}, {8, 6, 7}, {8, 7, 9},
	}
	filledSet := map[[2]int]int{}
	for _, f := range filled {
		filledSet[[2]int{f[0], f[1]}] = f[2]
	}

	var sb strings.Builder

	// Background glow
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="%s" opacity="0.06" filter="url(#blur-sm)"/>`,
		off-4, off-4, total+8, total+8, acc1)

	// Cell backgrounds
	for r := 0; r < n; r++ {
		for c := 0; c < n; c++ {
			x := off + c*cs
			y := off + r*cs
			_, isFilled := filledSet[[2]int{r, c}]
			if isFilled {
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="%s" fill-opacity="0.22"/>`,
					x, y, cs, cs, acc1)
			} else {
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="#0a1628"/>`,
					x, y, cs, cs)
			}
		}
	}

	// Thin cell grid lines
	for i := 0; i <= n; i++ {
		pos := off + i*cs
		// skip box borders (drawn separately)
		if i%3 != 0 {
			fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="white" stroke-width="0.3" opacity="0.08"/>`,
				pos, off, pos, off+total)
			fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="white" stroke-width="0.3" opacity="0.08"/>`,
				off, pos, off+total, pos)
		}
	}

	// Box border lines (every 3 cells)
	for i := 0; i <= 3; i++ {
		pos := off + i*cs*3
		fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5" opacity="0.50"/>`,
			pos, off, pos, off+total, acc1)
		fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5" opacity="0.50"/>`,
			off, pos, off+total, pos, acc1)
	}

	// Outer border
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="none" stroke="%s" stroke-width="2"/>`,
		off, off, total, total, acc1)

	// Numbers + glow on filled cells
	for _, f := range filled {
		r, c, num := f[0], f[1], f[2]
		cx := off + c*cs + cs/2
		cy := off + r*cs + cs/2 + 6
		// glow dot
		fmt.Fprintf(&sb, `<circle cx="%d" cy="%d" r="10" fill="%s" opacity="0.25" filter="url(#blur-sm)"/>`,
			cx, cy-4, acc1)
		// number
		fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="monospace" font-size="17" font-weight="700" fill="%s" text-anchor="middle">%d</text>`,
			cx, cy, acc1, num)
	}

	return sb.String()
}

// ── Minesweeper ──────────────────────────────────────────────────────────────

func minesweeperBoard(acc1, acc2 string) string {
	const cs = 36
	const n = 8
	const total = cs * n // 288
	const off = -total / 2

	type cellState int
	const (
		hidden cellState = iota
		revealed
		mine
		flagged
		highlight
	)
	type cell struct {
		state cellState
		num   int
		color string
	}

	grid := [8][8]cell{}
	// Set defaults
	for r := 0; r < 8; r++ {
		for c := 0; c < 8; c++ {
			grid[r][c] = cell{state: hidden}
		}
	}
	// Highlights (slightly lighter unrevealed)
	for _, pos := range [][2]int{{0, 3}, {0, 7}, {6, 0}, {6, 7}, {7, 3}} {
		grid[pos[0]][pos[1]].state = highlight
	}
	// Revealed with numbers
	grid[1][2] = cell{state: revealed, num: 2, color: acc1}
	grid[1][5] = cell{state: revealed, num: 3, color: acc2}
	grid[2][3] = cell{state: revealed, num: 1, color: acc1}
	grid[3][1] = cell{state: revealed, num: 4, color: "#ef4444"}
	grid[5][2] = cell{state: revealed, num: 2, color: acc1}
	grid[5][5] = cell{state: revealed, num: 1, color: acc1}
	// Mine
	grid[3][4] = cell{state: mine}
	// Flag
	grid[4][6] = cell{state: flagged}

	var sb strings.Builder

	// Board background with glow
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" opacity="0.40" filter="url(#blur-sm)"/>`,
		off-3, off-3, total+6, total+6, acc1)
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="#061a0a"/>`, off, off, total, total)
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="none" stroke="%s" stroke-width="1.5" opacity="0.50"/>`,
		off, off, total, total, acc1)

	for r := 0; r < n; r++ {
		for c := 0; c < n; c++ {
			x := off + c*cs + 1
			y := off + r*cs + 1
			w := cs - 2
			cl := grid[r][c]

			switch cl.state {
			case hidden:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="#0d2b12" stroke="%s" stroke-width="0.5" stroke-opacity="0.30"/>`,
					x, y, w, w, acc1)
			case highlight:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="#102d14" stroke="%s" stroke-width="0.5" stroke-opacity="0.40"/>`,
					x, y, w, w, acc1)
			case revealed:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="#1a3d1a"/>`, x, y, w, w)
				// top highlight
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="2" fill="white" opacity="0.05"/>`, x, y, w)
				cx := x + w/2
				cy := y + w/2 + 7
				fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="monospace" font-size="18" font-weight="800" fill="%s" text-anchor="middle">%d</text>`,
					cx, cy, cl.color, cl.num)
			case mine:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="#2a0000"/>`, x, y, w, w)
				cx := x + w/2
				cy := y + w/2
				fmt.Fprintf(&sb, `<circle cx="%d" cy="%d" r="8" fill="#ef4444" opacity="0.90"/>`, cx, cy)
				fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="white" stroke-width="1.5" opacity="0.60"/>`,
					cx-6, cy, cx+6, cy)
				fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="white" stroke-width="1.5" opacity="0.60"/>`,
					cx, cy-6, cx, cy+6)
			case flagged:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="#1a1a00" stroke="#eab308" stroke-width="0.5" stroke-opacity="0.60"/>`,
					x, y, w, w)
				cx := x + w/2
				cy := y + w/2 + 6
				fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="sans-serif" font-size="16" text-anchor="middle">⚑</text>`, cx, cy)
			}
		}
	}

	return sb.String()
}

// ── Tetris ───────────────────────────────────────────────────────────────────

func tetrisBoard(_, _ string) string {
	const cs = 22
	const gap = 1
	const cols = 10
	const rows = 14
	const w = cols*(cs+gap) - gap // 229
	const h = rows*(cs+gap) - gap // 321
	const offX = -w / 2
	const offY = -h / 2

	// Block colors: 0=empty, I=teal, O=yellow, T=purple, S=green, Z=red, J=blue, L=orange
	colors := map[byte]string{
		'I': "#14b8a6", 'O': "#eab308", 'T': "#a855f7",
		'S': "#22c55e", 'Z': "#ef4444", 'J': "#3b82f6", 'L': "#f97316",
	}

	// Board: 14 rows × 10 cols (row 0 = top)
	board := [14][10]byte{
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 'T', 'T', 'T', 0, 0, 0, 0},
		{0, 0, 0, 0, 'T', 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 0, 0, 0, 0, 0, 0},
		{0, 0, 0, 0, 'S', 'S', 'S', 0, 0, 'J'},
		{0, 'I', 'I', 'I', 'I', 0, 0, 0, 'J', 'J'},
		{'L', 0, 'O', 'O', 'O', 'O', 'J', 'J', 'J', 0},
		{'L', 'L', 'T', 'T', 'T', 0, 0, 'Z', 'Z', 0},
		{'L', 'L', 0, 'S', 'S', 'S', 'Z', 'Z', 0, 0},
		{'I', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'I'},
	}

	var sb strings.Builder

	// Well background
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="5" fill="#080010" stroke="#a855f7" stroke-width="1.5" stroke-opacity="0.50"/>`,
		offX-1, offY-1, w+2, h+2)

	// Subtle column guide lines
	for c := 1; c < cols; c++ {
		x := offX + c*(cs+gap) - gap
		fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="white" stroke-width="0.5" opacity="0.03"/>`,
			x, offY, x, offY+h)
	}

	// Blocks
	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			b := board[r][c]
			x := offX + c*(cs+gap)
			y := offY + r*(cs+gap)
			if b == 0 {
				// Empty cell: faint grid
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="#0d0020" rx="1"/>`,
					x, y, cs, cs)
			} else {
				col := colors[b]
				// Main block
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="%s" opacity="0.90"/>`,
					x, y, cs, cs, col)
				// Top highlight
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="4" rx="2" fill="white" opacity="0.30"/>`,
					x, y, cs)
				// Left highlight
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="3" height="%d" fill="white" opacity="0.20"/>`,
					x, y+4, cs-4)
			}
		}
	}

	return sb.String()
}

// ── Chess ────────────────────────────────────────────────────────────────────

func chessBoard(acc1, _ string) string {
	const cs = 36
	const n = 8
	const total = cs * n // 288
	const off = -total / 2

	type piece struct {
		row, col int
		sym      string
		white    bool
	}
	pieces := []piece{
		{7, 4, "♔", true}, {7, 3, "♕", true}, {7, 0, "♖", true}, {7, 7, "♖", true},
		{7, 1, "♘", true}, {7, 6, "♘", true}, {7, 2, "♗", true},
		{6, 0, "♙", true}, {6, 1, "♙", true}, {6, 4, "♙", true}, {6, 7, "♙", true},
		{0, 4, "♚", false}, {0, 3, "♛", false}, {0, 0, "♜", false}, {0, 7, "♜", false},
		{0, 1, "♞", false}, {0, 6, "♞", false},
		{1, 3, "♟", false}, {1, 5, "♟", false}, {2, 4, "♟", false},
		{4, 4, "♙", true}, {3, 3, "♟", false},
	}

	var sb strings.Builder

	// Board glow
	fmt.Fprintf(&sb, `<ellipse cx="0" cy="0" rx="160" ry="155" fill="%s" opacity="0.08" filter="url(#blur-md)"/>`, acc1)

	// Border
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="none" stroke="#d4a853" stroke-width="4"/>`,
		off-4, off-4, total+8, total+8)
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="none" stroke="black" stroke-width="1" opacity="0.50"/>`,
		off-2, off-2, total+4, total+4)

	// Squares
	for r := 0; r < n; r++ {
		for c := 0; c < n; c++ {
			x := off + c*cs
			y := off + r*cs
			if (r+c)%2 == 0 {
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="#d4b87a"/>`, x, y, cs, cs)
			} else {
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="#8b5e35"/>`, x, y, cs, cs)
			}
		}
	}

	// Pieces
	for _, p := range pieces {
		cx := off + p.col*cs + cs/2
		cy := off + p.row*cs + cs/2 + 9
		if p.white {
			fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="serif" font-size="26" text-anchor="middle" fill="white" stroke="#333" stroke-width="0.5">%s</text>`,
				cx, cy, p.sym)
		} else {
			fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="serif" font-size="26" text-anchor="middle" fill="#1a0a00" stroke="#8b5e35" stroke-width="0.3">%s</text>`,
				cx, cy, p.sym)
		}
	}

	return sb.String()
}

// ── Math24 ───────────────────────────────────────────────────────────────────

func math24Board(acc1, acc2 string) string {
	const cw = 115
	const ch = 145
	const gap = 14
	const offX = -(cw*2+gap) / 2
	const offY = -(ch*2+gap) / 2

	nums := [4]int{3, 8, 6, 4}
	positions := [4][2]int{{0, 0}, {1, 0}, {0, 1}, {1, 1}}

	var sb strings.Builder

	// Background glow
	fmt.Fprintf(&sb, `<ellipse cx="0" cy="0" rx="140" ry="165" fill="%s" opacity="0.10" filter="url(#blur-md)"/>`, acc1)

	for i, pos := range positions {
		col, row := pos[0], pos[1]
		x := offX + col*(cw+gap)
		y := offY + row*(ch+gap)
		cx := x + cw/2
		cy := y + ch/2

		// Card glow
		fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="14" fill="%s" opacity="0.15" filter="url(#blur-sm)"/>`,
			x-4, y-4, cw+8, ch+8, acc1)
		// Card background
		fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="14" fill="%s" fill-opacity="0.10" stroke="%s" stroke-width="1.5"/>`,
			x, y, cw, ch, acc1, acc1)
		// Card inner subtle gradient overlay
		fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="12" fill="%s" fill-opacity="0.05"/>`,
			x+2, y+2, cw-4, ch-4, acc2)

		// Corner number (top-left)
		fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="white" fill-opacity="0.40">%d</text>`,
			x+10, y+22, nums[i])

		// Main number
		fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="66" font-weight="900" fill="white" text-anchor="middle" dominant-baseline="middle">%d</text>`,
			cx, cy+4, nums[i])

		// Corner number (bottom-right, rotated)
		fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="white" fill-opacity="0.40" text-anchor="end">%d</text>`,
			x+cw-8, y+ch-8, nums[i])
	}

	// Center operators
	fmt.Fprintf(&sb, `<text x="0" y="-4" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="%s" fill-opacity="0.60" text-anchor="middle">×</text>`, acc1)

	return sb.String()
}

// ── Sokoban ──────────────────────────────────────────────────────────────────

func sokobanBoard(acc1, _ string, bgAccent string) string {
	const cs = 36
	mapGrid := []string{
		"########",
		"#......#",
		"#.@..$.#",
		"#..##..#",
		"#.$....#",
		"#...$..#",
		"#......#",
		"########",
	}
	n := len(mapGrid)
	total := cs * n
	off := -total / 2

	var sb strings.Builder

	// Board glow
	fmt.Fprintf(&sb, `<ellipse cx="0" cy="0" rx="155" ry="155" fill="%s" opacity="0.20" filter="url(#blur-md)"/>`, acc1)

	for r, row := range mapGrid {
		for c, ch := range row {
			x := off + c*cs
			y := off + r*cs
			cx := x + cs/2
			cy := y + cs/2

			switch ch {
			case '#':
				// Wall
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="2" fill="%s" stroke="%s" stroke-width="0.5" stroke-opacity="0.30"/>`,
					x, y, cs, cs, bgAccent, acc1)
				// Top highlight on wall
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="4" fill="white" opacity="0.06"/>`, x, y, cs)
			case '.':
				// Floor
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="#080808" opacity="0.60"/>`, x, y, cs, cs)
				// Subtle target dot
				fmt.Fprintf(&sb, `<circle cx="%d" cy="%d" r="3" fill="white" opacity="0.06"/>`, cx, cy)
			case '$':
				// Floor under box
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="#080808" opacity="0.60"/>`, x, y, cs, cs)
				// Box shadow
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="%s" opacity="0.20" filter="url(#blur-sm)"/>`,
					x+2, y+4, cs-2, cs-2, acc1)
				// Box
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="%s" opacity="0.85" stroke="%s" stroke-width="1"/>`,
					x+4, y+4, cs-8, cs-8, acc1, acc1)
				// Box cross
				bx := x + 4
				by := y + 4
				bw := cs - 8
				fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="white" stroke-width="1" opacity="0.40"/>`,
					bx, by, bx+bw, by+bw)
				fmt.Fprintf(&sb, `<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="white" stroke-width="1" opacity="0.40"/>`,
					bx+bw, by, bx, by+bw)
			case '@':
				// Floor
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="#080808" opacity="0.60"/>`, x, y, cs, cs)
				// Player glow
				fmt.Fprintf(&sb, `<circle cx="%d" cy="%d" r="14" fill="%s" opacity="0.30" filter="url(#blur-sm)"/>`, cx, cy, acc1)
				// Player outer circle
				fmt.Fprintf(&sb, `<circle cx="%d" cy="%d" r="13" fill="white" opacity="0.90"/>`, cx, cy)
				// Player inner circle (accent)
				fmt.Fprintf(&sb, `<circle cx="%d" cy="%d" r="8" fill="%s"/>`, cx, cy, acc1)
			}
		}
	}

	return sb.String()
}

// ── Wordle ───────────────────────────────────────────────────────────────────

func wordleBoard(acc1, _ string) string {
	const cs = 52
	const gap = 6
	const cols = 5
	const rows = 6
	const w = cols*(cs+gap) - gap
	const h = rows*(cs+gap) - gap
	const offX = -w / 2
	const offY = -h / 2

	type tileState int
	const (
		tileEmpty tileState = iota
		tileCorrect
		tilePresent
		tileAbsent
	)
	type tile struct {
		state tileState
		letter string
	}

	grid := [6][5]tile{
		{{tileCorrect, "W"}, {tileCorrect, "O"}, {tileCorrect, "R"}, {tileCorrect, "D"}, {tileCorrect, "L"}},
		{{tilePresent, "W"}, {tileCorrect, "O"}, {tileAbsent, "R"}, {tilePresent, "D"}, {tileAbsent, "E"}},
		{{tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}},
		{{tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}},
		{{tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}},
		{{tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}, {tileEmpty, ""}},
	}

	var sb strings.Builder

	// Board glow
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" fill="%s" opacity="0.05" filter="url(#blur-sm)"/>`,
		offX-4, offY-4, w+8, h+8, acc1)

	for r := 0; r < rows; r++ {
		for c := 0; c < cols; c++ {
			t := grid[r][c]
			x := offX + c*(cs+gap)
			y := offY + r*(cs+gap)
			cx := x + cs/2
			cy := y + cs/2 + 10

			switch t.state {
			case tileCorrect:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="#166534" stroke="#22c55e" stroke-width="2"/>`, x, y, cs, cs)
				fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="28" font-weight="900" fill="white" text-anchor="middle">%s</text>`,
					cx, cy, t.letter)
			case tilePresent:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="#713f12" stroke="#eab308" stroke-width="2"/>`, x, y, cs, cs)
				fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="28" font-weight="900" fill="white" text-anchor="middle">%s</text>`,
					cx, cy, t.letter)
			case tileAbsent:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="#1e293b" stroke="#475569" stroke-width="1.5"/>`, x, y, cs, cs)
				fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="28" font-weight="900" fill="white" fill-opacity="0.50" text-anchor="middle">%s</text>`,
					cx, cy, t.letter)
			case tileEmpty:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="4" fill="transparent" stroke="#334155" stroke-width="1.5"/>`, x, y, cs, cs)
			}
		}
	}

	return sb.String()
}

// ── 2048 ─────────────────────────────────────────────────────────────────────

func board2048(acc1, _ string) string {
	const cs = 68
	const gap = 8
	const n = 4
	const total = n*(cs+gap) - gap // 304
	const off = -total / 2

	board := [4][4]int{
		{2048, 256, 8, 2},
		{512, 64, 16, 4},
		{128, 32, 4, 2},
		{16, 4, 2, 0},
	}

	cellFill := map[int]string{
		0:    "#1a1407",
		2:    "#3b2e00",
		4:    "#4a3a00",
		8:    "#6b3d00",
		16:   "#7c2d00",
		32:   "#8b1a00",
		64:   "#7c0000",
		128:  "#5a4400",
		256:  "#4d3d00",
		512:  "#3d3000",
		1024: "#2a2200",
		2048: "#1a1500",
	}
	textFill := func(v int) string {
		if v >= 8 {
			return "white"
		}
		return "#4a3800"
	}
	fontSize := func(v int) int {
		switch {
		case v >= 1000:
			return 28
		case v >= 100:
			return 32
		default:
			return 36
		}
	}

	var sb strings.Builder

	// Board background
	fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="10" fill="#0d0a04" stroke="%s" stroke-width="1" stroke-opacity="0.50"/>`,
		off, off, total, total, acc1)

	for r := 0; r < n; r++ {
		for c := 0; c < n; c++ {
			v := board[r][c]
			x := off + c*(cs+gap)
			y := off + r*(cs+gap)
			cx := x + cs/2
			cy := y + cs/2

			fill := cellFill[v]
			if fill == "" {
				fill = "#1a1407"
			}

			if v == 2048 {
				// Golden glow for 2048
				fmt.Fprintf(&sb, `<ellipse cx="%d" cy="%d" rx="36" ry="36" fill="%s" opacity="0.30" filter="url(#blur-md)"/>`, cx, cy, acc1)
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" stroke="%s" stroke-width="2"/>`,
					x, y, cs, cs, fill, acc1)
			} else {
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s"/>`, x, y, cs, cs, fill)
			}

			if v > 0 {
				fmt.Fprintf(&sb, `<text x="%d" y="%d" font-family="system-ui,sans-serif" font-size="%d" font-weight="900" fill="%s" text-anchor="middle" dominant-baseline="middle">%d</text>`,
					cx, cy, fontSize(v), textFill(v), v)
			}
		}
	}

	return sb.String()
}

// ── Puzzle Default ────────────────────────────────────────────────────────────

func puzzleDefaultBoard(acc1, acc2 string) string {
	const cs = 36
	const gap = 8
	const n = 7
	const total = n*(cs+gap) - gap
	const off = -total / 2

	// 0=empty, 1=filled acc1, 2=filled acc2
	pattern := [7][7]int{
		{1, 0, 1, 2, 1, 0, 1},
		{0, 2, 1, 0, 2, 1, 0},
		{1, 1, 0, 1, 0, 2, 1},
		{2, 0, 1, 2, 1, 0, 2},
		{1, 2, 0, 1, 0, 1, 1},
		{0, 1, 2, 0, 2, 0, 0},
		{1, 0, 1, 1, 0, 1, 2},
	}
	// opacity per cell type
	opacities := [7][7]float64{
		{0.80, 0, 0.55, 0.65, 0.70, 0, 0.50},
		{0, 0.55, 0.75, 0, 0.60, 0.80, 0},
		{0.65, 0.90, 0, 0.70, 0, 0.50, 0.60},
		{0.55, 0, 0.80, 0.70, 0.65, 0, 0.75},
		{0.70, 0.60, 0, 0.85, 0, 0.55, 0.65},
		{0, 0.75, 0.55, 0, 0.70, 0, 0},
		{0.60, 0, 0.65, 0.80, 0, 0.70, 0.50},
	}

	var sb strings.Builder

	for r := 0; r < n; r++ {
		for c := 0; c < n; c++ {
			x := off + c*(cs+gap)
			y := off + r*(cs+gap)
			v := pattern[r][c]
			op := opacities[r][c]

			switch v {
			case 0:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="none" stroke="%s" stroke-width="1" stroke-opacity="0.18"/>`,
					x, y, cs, cs, acc1)
			case 1:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" opacity="%.2f" filter="url(#glow-sm)"/>`,
					x, y, cs, cs, acc1, op)
			case 2:
				fmt.Fprintf(&sb, `<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" opacity="%.2f"/>`,
					x, y, cs, cs, acc2, op)
			}
		}
	}

	return sb.String()
}
