package covergen

import (
	"fmt"
	"strings"
	"unicode/utf8"
)

// PostInfo holds metadata used to generate the cover image.
type PostInfo struct {
	Slug    string
	TitleEN string
	TitleZH string
	DescEN  string
	DescZH  string
	Date    string // YYYY-MM-DD
	TagsEN  string
	TagsZH  string
}

type gameTheme struct {
	gameType string
	label    string
	accFrom  string
	accTo    string
	bgAccent string
}

func detectTheme(p PostInfo) gameTheme {
	hay := strings.ToLower(p.Slug + " " + p.TitleEN + " " + p.TitleZH + " " + p.TagsEN + " " + p.TagsZH)
	switch {
	case strings.Contains(hay, "sudoku") || strings.Contains(hay, "数独"):
		return gameTheme{"SUDOKU", "SUDOKU", "#3b82f6", "#6366f1", "#0d1f3c"}
	case strings.Contains(hay, "minesweeper") || strings.Contains(hay, "扫雷"):
		return gameTheme{"MINESWEEPER", "MINESWEEPER", "#22c55e", "#16a34a", "#051a0a"}
	case strings.Contains(hay, "tetris") || strings.Contains(hay, "俄罗斯方块"):
		return gameTheme{"TETRIS", "TETRIS", "#a855f7", "#7c3aed", "#1a0533"}
	case strings.Contains(hay, "chess") || strings.Contains(hay, "象棋") || strings.Contains(hay, "国际象棋"):
		return gameTheme{"CHESS", "CHESS", "#f59e0b", "#d97706", "#2a1500"}
	case strings.Contains(hay, "sokoban") || strings.Contains(hay, "推箱子"):
		return gameTheme{"SOKOBAN", "SOKOBAN", "#f97316", "#ea580c", "#2a0e00"}
	case strings.Contains(hay, "math24") || strings.Contains(hay, "24点"):
		return gameTheme{"MATH24", "MATH 24", "#ef4444", "#dc2626", "#2a0000"}
	case strings.Contains(hay, "wordle") || strings.Contains(hay, "填词"):
		return gameTheme{"WORDLE", "WORDLE", "#14b8a6", "#0d9488", "#00201e"}
	case strings.Contains(hay, "2048"):
		return gameTheme{"2048", "2048", "#eab308", "#ca8a04", "#1e1500"}
	default:
		return gameTheme{"PUZZLE", "PUZZLE", "#6366f1", "#8b5cf6", "#0f0b2a"}
	}
}

func wrapText(s string, maxRunes int) []string {
	if utf8.RuneCountInString(s) <= maxRunes {
		return []string{s}
	}
	words := strings.Fields(s)
	var lines []string
	cur := ""
	for _, w := range words {
		test := cur
		if test != "" {
			test += " "
		}
		test += w
		if utf8.RuneCountInString(test) > maxRunes && cur != "" {
			lines = append(lines, cur)
			cur = w
		} else {
			cur = test
		}
	}
	if cur != "" {
		lines = append(lines, cur)
	}
	if len(lines) == 0 {
		r := []rune(s)
		lines = append(lines, string(r[:maxRunes]))
		if len(r) > maxRunes {
			lines = append(lines, string(r[maxRunes:]))
		}
	}
	return lines
}

func truncate(s string, max int) string {
	r := []rune(s)
	if len(r) <= max {
		return s
	}
	return string(r[:max-1]) + "…"
}

func escapeXML(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	return s
}

// GenerateSVG produces a 1200×630 SVG cover image for the given post.
func GenerateSVG(p PostInfo) string {
	t := detectTheme(p)
	board := boardForTheme(t)

	titleLines := wrapText(p.TitleEN, 19)
	if len(titleLines) > 2 {
		titleLines = titleLines[:2]
	}
	descLines := wrapText(p.DescEN, 44)
	if len(descLines) > 2 {
		descLines = descLines[:2]
	}
	titleZH := truncate(p.TitleZH, 22)

	// Y positions adapt to title line count
	titleY1 := 175
	titleY2 := 248
	var zhY, descY1, descY2 int
	if len(titleLines) <= 1 {
		zhY = 240
		descY1 = 302
		descY2 = 330
	} else {
		zhY = 310
		descY1 = 372
		descY2 = 400
	}

	dateFmt := p.Date
	if len(p.Date) == 10 {
		dateFmt = p.Date[:4] + " · " + p.Date[5:7] + " · " + p.Date[8:10]
	}

	particles := [][4]float64{
		{720, 150, 3, 0.40}, {820, 95, 2, 0.25}, {1050, 120, 4, 0.30}, {1130, 200, 2, 0.35},
		{700, 430, 3, 0.30}, {760, 520, 2, 0.20}, {1080, 450, 3, 0.40}, {1140, 390, 2, 0.30},
		{650, 280, 2, 0.20}, {1160, 315, 4, 0.25}, {850, 560, 3, 0.30}, {980, 590, 2, 0.20},
		{730, 200, 2, 0.15}, {1100, 280, 2, 0.20}, {670, 480, 2, 0.15}, {1050, 520, 3, 0.25},
		{900, 50, 3, 0.20}, {950, 580, 2, 0.15},
	}

	var sb strings.Builder

	sb.WriteString(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">`)

	// ── Defs ────────────────────────────────────────────────────────────────
	sb.WriteString(`<defs>`)
	sb.WriteString(`<radialGradient id="bg-grad" cx="40%" cy="50%" r="70%">`)
	sb.WriteString(`<stop offset="0%" stop-color="#1a2744"/>`)
	sb.WriteString(`<stop offset="100%" stop-color="#080c18"/>`)
	sb.WriteString(`</radialGradient>`)
	fmt.Fprintf(&sb,
		`<linearGradient id="acc-grad" x1="0%%" y1="0%%" x2="100%%" y2="0%%"><stop offset="0%%" stop-color="%s"/><stop offset="100%%" stop-color="%s"/></linearGradient>`,
		t.accFrom, t.accTo)
	fmt.Fprintf(&sb,
		`<linearGradient id="acc-grad-v" x1="0%%" y1="0%%" x2="0%%" y2="100%%"><stop offset="0%%" stop-color="%s"/><stop offset="100%%" stop-color="%s" stop-opacity="0"/></linearGradient>`,
		t.accFrom, t.accFrom)
	sb.WriteString(`<filter id="blur-sm" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter>`)
	sb.WriteString(`<filter id="blur-md" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>`)
	sb.WriteString(`<filter id="blur-lg" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="32"/></filter>`)
	sb.WriteString(`<filter id="glow-sm" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`)
	sb.WriteString(`</defs>`)

	// ── Background ──────────────────────────────────────────────────────────
	sb.WriteString(`<rect width="1200" height="630" fill="url(#bg-grad)"/>`)

	// Dot grid texture
	for row := 0; row < 13; row++ {
		for col := 0; col < 25; col++ {
			fmt.Fprintf(&sb, `<circle cx="%d" cy="%d" r="1.5" fill="white" opacity="0.055"/>`, col*50, row*50)
		}
	}

	// ── Left accent line ────────────────────────────────────────────────────
	sb.WriteString(`<line x1="55" y1="40" x2="55" y2="590" stroke="url(#acc-grad-v)" stroke-width="3" opacity="0.75"/>`)

	// ── Right glow zone ─────────────────────────────────────────────────────
	fmt.Fprintf(&sb, `<ellipse cx="900" cy="315" rx="280" ry="240" fill="%s" opacity="0.55" filter="url(#blur-lg)"/>`, t.bgAccent)
	fmt.Fprintf(&sb, `<ellipse cx="900" cy="315" rx="220" ry="190" fill="%s" opacity="0.12" filter="url(#blur-md)"/>`, t.accFrom)
	fmt.Fprintf(&sb, `<circle cx="900" cy="315" r="200" fill="none" stroke="%s" stroke-width="1" opacity="0.07"/>`, t.accFrom)
	fmt.Fprintf(&sb, `<circle cx="900" cy="315" r="270" fill="none" stroke="%s" stroke-width="1" opacity="0.04"/>`, t.accFrom)

	for _, pt := range particles {
		fmt.Fprintf(&sb, `<circle cx="%.0f" cy="%.0f" r="%.0f" fill="%s" opacity="%.2f"/>`, pt[0], pt[1], pt[2], t.accFrom, pt[3])
	}

	// ── Game board ───────────────────────────────────────────────────────────
	sb.WriteString(`<g transform="translate(900,315) rotate(-8)">`)
	sb.WriteString(board)
	sb.WriteString(`</g>`)

	// ── Divider ──────────────────────────────────────────────────────────────
	sb.WriteString(`<line x1="630" y1="30" x2="630" y2="600" stroke="white" stroke-width="1" opacity="0.05"/>`)

	// ── Site pill badge ──────────────────────────────────────────────────────
	fmt.Fprintf(&sb, `<rect x="76" y="36" width="116" height="26" rx="13" fill="%s" fill-opacity="0.15" stroke="%s" stroke-opacity="0.30" stroke-width="1"/>`, t.accFrom, t.accFrom)
	sb.WriteString(`<text x="134" y="54" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="white" fill-opacity="0.60" text-anchor="middle" letter-spacing="3">PUZZLE PK</text>`)

	// Game type label
	fmt.Fprintf(&sb, `<text x="80" y="106" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="%s" letter-spacing="5">%s</text>`, t.accFrom, t.label)

	// EN title
	if len(titleLines) >= 1 {
		fmt.Fprintf(&sb, `<text x="80" y="%d" font-family="system-ui,sans-serif" font-size="58" font-weight="800" fill="white" letter-spacing="-1">%s</text>`, titleY1, escapeXML(titleLines[0]))
	}
	if len(titleLines) >= 2 {
		fmt.Fprintf(&sb, `<text x="80" y="%d" font-family="system-ui,sans-serif" font-size="58" font-weight="800" fill="white" letter-spacing="-1">%s</text>`, titleY2, escapeXML(titleLines[1]))
	}

	// ZH subtitle
	if titleZH != "" {
		fmt.Fprintf(&sb, `<text x="80" y="%d" font-family="'PingFang SC','Noto Sans CJK SC','Microsoft YaHei',system-ui,sans-serif" font-size="27" fill="white" fill-opacity="0.58">%s</text>`, zhY, escapeXML(titleZH))
	}

	// Description
	if p.DescEN != "" && len(descLines) >= 1 {
		fmt.Fprintf(&sb, `<text x="80" y="%d" font-family="system-ui,sans-serif" font-size="17" fill="white" fill-opacity="0.38">%s</text>`, descY1, escapeXML(descLines[0]))
	}
	if len(descLines) >= 2 {
		fmt.Fprintf(&sb, `<text x="80" y="%d" font-family="system-ui,sans-serif" font-size="17" fill="white" fill-opacity="0.38">%s</text>`, descY2, escapeXML(descLines[1]))
	}

	// Date pill
	if dateFmt != "" {
		fmt.Fprintf(&sb, `<rect x="76" y="556" width="136" height="26" rx="13" fill="%s" fill-opacity="0.15" stroke="%s" stroke-opacity="0.40" stroke-width="1"/>`, t.accFrom, t.accFrom)
		fmt.Fprintf(&sb, `<text x="144" y="574" font-family="system-ui,sans-serif" font-size="12" fill="%s" text-anchor="middle" letter-spacing="1">%s</text>`, t.accFrom, dateFmt)
	}

	// ── Bottom strip ─────────────────────────────────────────────────────────
	sb.WriteString(`<rect x="0" y="604" width="1200" height="18" fill="url(#acc-grad)" opacity="0.20" filter="url(#blur-sm)"/>`)
	sb.WriteString(`<rect x="0" y="616" width="1200" height="14" fill="url(#acc-grad)" opacity="0.90"/>`)
	sb.WriteString(`<text x="1140" y="611" font-family="system-ui,sans-serif" font-size="11" fill="white" fill-opacity="0.20" text-anchor="end">puzzlepk.com</text>`)

	sb.WriteString(`</svg>`)
	return sb.String()
}

func boardForTheme(t gameTheme) string {
	switch t.gameType {
	case "SUDOKU":
		return sudokuBoard(t.accFrom, t.accTo)
	case "MINESWEEPER":
		return minesweeperBoard(t.accFrom, t.accTo)
	case "TETRIS":
		return tetrisBoard(t.accFrom, t.accTo)
	case "CHESS":
		return chessBoard(t.accFrom, t.accTo)
	case "MATH24":
		return math24Board(t.accFrom, t.accTo)
	case "SOKOBAN":
		return sokobanBoard(t.accFrom, t.accTo, t.bgAccent)
	case "WORDLE":
		return wordleBoard(t.accFrom, t.accTo)
	case "2048":
		return board2048(t.accFrom, t.accTo)
	default:
		return puzzleDefaultBoard(t.accFrom, t.accTo)
	}
}
