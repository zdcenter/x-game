package covergen

import "fmt"

func sudokuBoard(acc1, _ string) string {
	cells := map[[2]int]int{
		{0, 0}: 5, {0, 1}: 3, {1, 0}: 6, {2, 3}: 9, {2, 4}: 8,
		{3, 0}: 8, {4, 2}: 4, {4, 4}: 6, {4, 6}: 8, {5, 8}: 3,
		{6, 1}: 2, {6, 5}: 4, {7, 4}: 1, {7, 7}: 8, {8, 6}: 7, {8, 7}: 9,
	}
	s := `<rect x="-162" y="-162" width="324" height="324" fill="#0a1628" rx="4" opacity="0.8"/>`
	for row := 0; row < 9; row++ {
		for col := 0; col < 9; col++ {
			x := -162 + col*36
			y := -162 + row*36
			if n, ok := cells[[2]int{row, col}]; ok {
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="35" height="35" fill="%s" opacity="0.55"/>`, x, y, acc1)
				s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="600" font-family="sans-serif" fill="white">%d</text>`,
					x+18, y+18, n)
			}
		}
	}
	// thin grid lines
	for i := 0; i <= 9; i++ {
		p := -162 + i*36
		sw, op := "0.5", "0.15"
		if i%3 == 0 {
			sw, op = "2", "0.5"
		}
		s += fmt.Sprintf(`<line x1="%d" y1="-162" x2="%d" y2="162" stroke="white" stroke-width="%s" opacity="%s"/>`, p, p, sw, op)
		s += fmt.Sprintf(`<line x1="-162" y1="%d" x2="162" y2="%d" stroke="white" stroke-width="%s" opacity="%s"/>`, p, p, sw, op)
	}
	return s
}

func minesweeperBoard(acc1, _ string) string {
	type special struct{ state string; val string }
	specials := map[[2]int]special{
		{2, 3}: {"revealed", "2"},
		{3, 3}: {"mine", "✕"},
		{4, 5}: {"revealed", "3"},
		{1, 6}: {"flagged", "▶"},
		{5, 1}: {"revealed", "1"},
	}
	s := `<rect x="-160" y="-160" width="320" height="320" fill="#061210" rx="6" opacity="0.8"/>`
	for row := 0; row < 8; row++ {
		for col := 0; col < 8; col++ {
			x := -160 + col*40
			y := -160 + row*40
			sp, isSpec := specials[[2]int{row, col}]
			switch {
			case isSpec && sp.state == "revealed":
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="39" height="39" fill="#0f2a1a" rx="3"/>`, x, y)
				s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="700" font-family="sans-serif" fill="%s">%s</text>`,
					x+20, y+20, acc1, sp.val)
			case isSpec && sp.state == "mine":
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="39" height="39" fill="#2a0a0a" rx="3"/>`, x, y)
				s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="700" font-family="sans-serif" fill="#ef4444">%s</text>`,
					x+20, y+20, sp.val)
			case isSpec && sp.state == "flagged":
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="39" height="39" fill="#1e3a3a" stroke="%s" stroke-width="1" rx="3" opacity="0.7"/>`, x, y, acc1)
				s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="18" font-family="sans-serif" fill="#f97316">%s</text>`,
					x+20, y+20, sp.val)
			default:
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="39" height="39" fill="#1e3a3a" stroke="%s" stroke-width="1" rx="3" opacity="0.7"/>`, x, y, acc1)
			}
		}
	}
	return s
}

func tetrisBoard(_, _ string) string {
	type blockRow struct {
		cols  [][2]int // [col, color_index]
	}
	colors := []string{"#7c3aed", "#3b82f6", "#ef4444", "#14b8a6", "#eab308", "#22c55e", "#f97316"}
	type cell struct{ r, c, ci int }
	placed := []cell{}
	// Row 13 all purple
	for c := 0; c < 10; c++ {
		placed = append(placed, cell{13, c, 0})
	}
	// Row 12
	for c := 0; c <= 3; c++ {
		placed = append(placed, cell{12, c, 1})
	}
	for c := 7; c <= 9; c++ {
		placed = append(placed, cell{12, c, 2})
	}
	// Row 11
	for c := 0; c <= 1; c++ {
		placed = append(placed, cell{11, c, 1})
	}
	for c := 2; c <= 4; c++ {
		placed = append(placed, cell{11, c, 3})
	}
	for c := 8; c <= 9; c++ {
		placed = append(placed, cell{11, c, 2})
	}
	// Row 10
	for c := 4; c <= 6; c++ {
		placed = append(placed, cell{10, c, 4})
	}
	for c := 8; c <= 9; c++ {
		placed = append(placed, cell{10, c, 2})
	}
	// Row 9
	for c := 5; c <= 8; c++ {
		placed = append(placed, cell{9, c, 5})
	}
	// Falling L-piece
	for _, r := range []int{1, 2, 3} {
		placed = append(placed, cell{r, 2, 6})
	}
	placed = append(placed, cell{3, 3, 6})

	s := fmt.Sprintf(`<rect x="-140" y="-196" width="280" height="392" fill="#1a0a2e" stroke="#a855f7" stroke-width="1" opacity="0.9" rx="4"/>`)
	// empty cell grid
	for row := 0; row < 14; row++ {
		for col := 0; col < 10; col++ {
			x := -140 + col*28
			y := -196 + row*28
			s += fmt.Sprintf(`<rect x="%d" y="%d" width="27" height="27" fill="none" stroke="#2d1b4e" stroke-width="0.5"/>`, x, y)
		}
	}
	for _, p := range placed {
		x := -140 + p.c*28
		y := -196 + p.r*28
		s += fmt.Sprintf(`<rect x="%d" y="%d" width="27" height="27" fill="%s" rx="2"/>`, x+1, y+1, colors[p.ci])
	}
	return s
}

func chessBoard(acc1, _ string) string {
	pieces := map[[2]int]string{
		{0, 4}: "♔", {0, 3}: "♛", {0, 0}: "♜", {0, 7}: "♜",
		{0, 1}: "♞", {0, 6}: "♞", {1, 0}: "♟", {1, 1}: "♟",
		{1, 2}: "♟", {7, 4}: "♚", {7, 3}: "♕", {7, 0}: "♖",
		{6, 0}: "♙", {6, 1}: "♙", {5, 5}: "♙",
	}
	blackPieces := map[string]bool{"♔": true, "♛": true, "♜": true, "♞": true, "♟": true}
	s := fmt.Sprintf(`<rect x="-162" y="-162" width="324" height="324" fill="none" stroke="%s" stroke-width="3" rx="4"/>`, acc1)
	for row := 0; row < 8; row++ {
		for col := 0; col < 8; col++ {
			x := -160 + col*40
			y := -160 + row*40
			light := (row+col)%2 == 0
			fill := "#e2c68a"
			if !light {
				fill = "#8b5e24"
			}
			s += fmt.Sprintf(`<rect x="%d" y="%d" width="40" height="40" fill="%s" opacity="0.85"/>`, x, y, fill)
			if p, ok := pieces[[2]int{row, col}]; ok {
				textFill := "white"
				if !blackPieces[p] {
					textFill = "#1a1a1a"
				}
				s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="24" font-family="serif" fill="%s">%s</text>`,
					x+20, y+20, textFill, p)
			}
		}
	}
	return s
}

func math24Board(acc1, acc2 string) string {
	nums := []int{3, 8, 6, 4}
	positions := [][2]int{{-130, -160}, {0, -160}, {-130, -10}, {0, -10}}
	s := ""
	for i, pos := range positions {
		x, y := pos[0], pos[1]
		_ = acc2
		s += fmt.Sprintf(`<rect x="%d" y="%d" width="120" height="140" fill="%s" fill-opacity="0.18" stroke="%s" stroke-width="2" rx="14"/>`,
			x, y, acc1, acc1)
		s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="60" font-weight="900" font-family="sans-serif" fill="white">%d</text>`,
			x+60, y+70, nums[i])
	}
	return s
}

func sokobanBoard(acc1, _ string) string {
	// '#' wall, '.' floor, '$' box, '@' player, '*' box-on-target, '+' player-on-target, 'T' target
	layout := []string{
		"########",
		"#......#",
		"#.####.#",
		"#.$..@.#",
		"#.#.T$.#",
		"#......#",
		"#..####",
		"########",
	}
	s := ""
	for row, line := range layout {
		for col, ch := range line {
			x := -152 + col*38
			y := -152 + row*38
			switch ch {
			case '#':
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="38" height="38" fill="#92400e"/>`, x, y)
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="36" height="36" fill="#7c3410" rx="2"/>`, x+1, y+1)
			case '.':
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="38" height="38" fill="#1c0a00" opacity="0.5"/>`, x, y)
			case '$':
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="38" height="38" fill="#1c0a00" opacity="0.5"/>`, x, y)
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="28" height="28" fill="%s" opacity="0.85" rx="4"/>`, x+5, y+5, acc1)
			case '@':
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="38" height="38" fill="#1c0a00" opacity="0.5"/>`, x, y)
				s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="14" fill="%s"/>`, x+19, y+19, acc1)
				s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="14" fill="white">😊</text>`, x+19, y+19)
			case 'T':
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="38" height="38" fill="#1c0a00" opacity="0.5"/>`, x, y)
				s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="8" fill="none" stroke="%s" stroke-width="2"/>`, x+19, y+19, acc1)
				s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="3" fill="%s"/>`, x+19, y+19, acc1)
			case '*':
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="38" height="38" fill="#1c0a00" opacity="0.5"/>`, x, y)
				s += fmt.Sprintf(`<rect x="%d" y="%d" width="28" height="28" fill="%s" opacity="0.85" rx="4"/>`, x+5, y+5, acc1)
				s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="5" fill="white" opacity="0.7"/>`, x+19, y+19)
			}
		}
	}
	return s
}

func wordleBoard(_, _ string) string {
	word := []string{"S", "U", "D", "O", "K"}
	row1 := []struct {
		l string
		c string
	}{
		{"P", "#22c55e"}, {"L", "#eab308"}, {"A", "#4b5563"}, {"Y", "#eab308"}, {"S", "#4b5563"},
	}
	s := ""
	for col, l := range word {
		x := -148 + col*58
		y := -168
		s += fmt.Sprintf(`<rect x="%d" y="%d" width="52" height="52" fill="#22c55e" rx="4"/>`, x, y)
		s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="900" font-family="sans-serif" fill="white">%s</text>`,
			x+26, y+26, l)
	}
	for col, r := range row1 {
		x := -148 + col*58
		y := -168 + 58
		s += fmt.Sprintf(`<rect x="%d" y="%d" width="52" height="52" fill="%s" rx="4"/>`, x, y, r.c)
		s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="28" font-weight="900" font-family="sans-serif" fill="white">%s</text>`,
			x+26, y+26, r.l)
	}
	for row := 2; row < 6; row++ {
		for col := 0; col < 5; col++ {
			x := -148 + col*58
			y := -168 + row*58
			s += fmt.Sprintf(`<rect x="%d" y="%d" width="52" height="52" fill="none" stroke="#4b5563" stroke-width="2" rx="4"/>`, x, y)
		}
	}
	return s
}

func board2048(_, _ string) string {
	cellColors := map[int]string{
		0: "#cdc1b4", 2: "#eee4da", 4: "#ede0c8", 8: "#f2b179", 16: "#f59563",
		32: "#f67c5f", 64: "#f65e3b", 128: "#edcf72", 256: "#edcc61",
		512: "#edc850", 1024: "#edc53f", 2048: "#edc22e",
	}
	board := [][]int{
		{2048, 4, 64, 2},
		{256, 32, 16, 8},
		{128, 8, 4, 2},
		{16, 4, 2, 0},
	}
	s := `<rect x="-160" y="-160" width="320" height="320" fill="#bbada0" rx="10"/>`
	for row := 0; row < 4; row++ {
		for col := 0; col < 4; col++ {
			x := -152 + col*80
			y := -152 + row*80
			v := board[row][col]
			fill, ok := cellColors[v]
			if !ok {
				fill = "#cdc1b4"
			}
			opacity := "0.9"
			if v == 0 {
				opacity = "0.3"
			}
			s += fmt.Sprintf(`<rect x="%d" y="%d" width="72" height="72" fill="%s" opacity="%s" rx="6"/>`, x, y, fill, opacity)
			if v > 0 {
				textFill := "#776e65"
				if v > 4 {
					textFill = "white"
				}
				fontSize := 28
				switch {
				case v >= 1024:
					fontSize = 18
				case v >= 128:
					fontSize = 22
				}
				s += fmt.Sprintf(`<text x="%d" y="%d" text-anchor="middle" dominant-baseline="central" font-size="%d" font-weight="900" font-family="sans-serif" fill="%s">%d</text>`,
					x+36, y+36, fontSize, textFill, v)
			}
		}
	}
	return s
}

func puzzleDefaultBoard(acc1, acc2 string) string {
	s := ""
	for row := 0; row < 8; row++ {
		for col := 0; col < 8; col++ {
			x := -126 + col*36
			y := -126 + row*36
			if (row+col)%3 == 0 {
				s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="5" fill="%s" opacity="0.7"/>`, x, y, acc1)
			} else if (row+col)%3 == 1 {
				s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="4" fill="none" stroke="%s" stroke-width="1.5" opacity="0.4"/>`, x, y, acc2)
			} else {
				s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="3" fill="%s" opacity="0.2"/>`, x, y, acc1)
			}
		}
	}
	// Add some decorative squares
	for i := 0; i < 5; i++ {
		x := -80 + i*40
		y := -20 + (i%2)*40
		s += fmt.Sprintf(`<rect x="%d" y="%d" width="30" height="30" fill="%s" opacity="0.1" rx="4" stroke="%s" stroke-width="1" stroke-opacity="0.3"/>`,
			x, y, acc1, acc1)
	}
	return s
}
