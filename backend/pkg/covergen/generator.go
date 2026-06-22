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
	accFrom  string
	accTo    string
	bgAccent string
}

func detectTheme(p PostInfo) gameTheme {
	haystack := strings.ToLower(p.Slug + " " + p.TitleEN + " " + p.TitleZH + " " + p.TagsEN + " " + p.TagsZH)
	switch {
	case strings.Contains(haystack, "sudoku") || strings.Contains(haystack, "数独"):
		return gameTheme{"SUDOKU", "#3b82f6", "#6366f1", "#1e3a8a"}
	case strings.Contains(haystack, "minesweeper") || strings.Contains(haystack, "扫雷"):
		return gameTheme{"MINESWEEPER", "#22c55e", "#16a34a", "#14532d"}
	case strings.Contains(haystack, "tetris") || strings.Contains(haystack, "俄罗斯方块"):
		return gameTheme{"TETRIS", "#a855f7", "#7c3aed", "#3b0764"}
	case strings.Contains(haystack, "chess") || strings.Contains(haystack, "象棋") || strings.Contains(haystack, "国际象棋"):
		return gameTheme{"CHESS", "#f59e0b", "#d97706", "#451a03"}
	case strings.Contains(haystack, "sokoban") || strings.Contains(haystack, "推箱子"):
		return gameTheme{"SOKOBAN", "#f97316", "#ea580c", "#431407"}
	case strings.Contains(haystack, "math24") || strings.Contains(haystack, "24点"):
		return gameTheme{"MATH24", "#ef4444", "#dc2626", "#450a0a"}
	case strings.Contains(haystack, "wordle") || strings.Contains(haystack, "填词"):
		return gameTheme{"WORDLE", "#14b8a6", "#0d9488", "#042f2e"}
	case strings.Contains(haystack, "2048"):
		return gameTheme{"2048", "#eab308", "#ca8a04", "#422006"}
	default:
		return gameTheme{"PUZZLE", "#6366f1", "#8b5cf6", "#1e1b4b"}
	}
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
		return sokobanBoard(t.accFrom, t.accTo)
	case "WORDLE":
		return wordleBoard(t.accFrom, t.accTo)
	case "2048":
		return board2048(t.accFrom, t.accTo)
	default:
		return puzzleDefaultBoard(t.accFrom, t.accTo)
	}
}

// wrapText splits text into lines of at most maxChars runes.
func wrapText(text string, maxChars int) []string {
	if utf8.RuneCountInString(text) <= maxChars {
		return []string{text}
	}
	words := strings.Fields(text)
	var lines []string
	current := ""
	for _, w := range words {
		candidate := w
		if current != "" {
			candidate = current + " " + w
		}
		if utf8.RuneCountInString(candidate) <= maxChars {
			current = candidate
		} else {
			if current != "" {
				lines = append(lines, current)
			}
			current = w
		}
	}
	if current != "" {
		lines = append(lines, current)
	}
	if len(lines) == 0 {
		// single long word — truncate
		runes := []rune(text)
		if len(runes) > maxChars {
			lines = []string{string(runes[:maxChars-1]) + "…"}
		} else {
			lines = []string{text}
		}
	}
	return lines
}

func truncateRunes(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n-1]) + "…"
}

func formatDate(d string) string {
	// YYYY-MM-DD → YYYY · MM · DD
	parts := strings.SplitN(d, "-", 3)
	if len(parts) == 3 {
		return parts[0] + " · " + parts[1] + " · " + parts[2]
	}
	return d
}

// xmlEsc escapes text for safe embedding in SVG XML.
func xmlEsc(s string) string {
	s = strings.ReplaceAll(s, "&", "&amp;")
	s = strings.ReplaceAll(s, "<", "&lt;")
	s = strings.ReplaceAll(s, ">", "&gt;")
	s = strings.ReplaceAll(s, `"`, "&quot;")
	return s
}

// GenerateSVG produces a 1200×630 SVG cover for the given post.
func GenerateSVG(p PostInfo) string {
	theme := detectTheme(p)
	board := boardForTheme(theme)

	titleLines := wrapText(p.TitleEN, 22)
	if len(titleLines) > 2 {
		titleLines = titleLines[:2]
	}
	descLines := wrapText(p.DescEN, 42)
	if len(descLines) > 2 {
		descLines = descLines[:2]
	}
	zhTitle := truncateRunes(p.TitleZH, 20)
	dateStr := formatDate(p.Date)

	// Title y-start depends on number of lines to vertically center the block
	titleYStart := 170
	titleText := ""
	for i, l := range titleLines {
		titleText += fmt.Sprintf(`<text x="60" y="%d" font-size="52" font-weight="700" font-family="sans-serif" fill="white">%s</text>`,
			titleYStart+i*70, xmlEsc(l))
	}

	descY := titleYStart + len(titleLines)*70 + 30
	if zhTitle != "" {
		descY += 48
	}

	descText := ""
	for i, l := range descLines {
		descText += fmt.Sprintf(`<text x="60" y="%d" font-size="22" font-family="sans-serif" fill="white" opacity="0.5">%s</text>`,
			descY+i*36, xmlEsc(l))
	}

	zhText := ""
	if zhTitle != "" {
		zhY := titleYStart + len(titleLines)*70 + 16
		zhText = fmt.Sprintf(`<text x="60" y="%d" font-size="30" font-family="sans-serif" fill="white" opacity="0.75">%s</text>`,
			zhY, xmlEsc(zhTitle))
	}

	svg := fmt.Sprintf(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
<defs>
  <radialGradient id="bg" cx="50%%" cy="50%%" r="70%%">
    <stop offset="0%%" stop-color="#1e293b"/>
    <stop offset="100%%" stop-color="#0f172a"/>
  </radialGradient>
  <linearGradient id="accentGrad" x1="0%%" y1="0%%" x2="100%%" y2="0%%">
    <stop offset="0%%" stop-color="%s"/>
    <stop offset="100%%" stop-color="%s"/>
  </linearGradient>
  <linearGradient id="titleGrad" x1="0%%" y1="0%%" x2="100%%" y2="0%%">
    <stop offset="0%%" stop-color="white"/>
    <stop offset="100%%" stop-color="%s" stop-opacity="0.9"/>
  </linearGradient>
  <filter id="glow" x="-50%%" y="-50%%" width="200%%" height="200%%">
    <feGaussianBlur stdDeviation="18" result="blur"/>
    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
  </filter>
  <filter id="softGlow" x="-30%%" y="-30%%" width="160%%" height="160%%">
    <feGaussianBlur stdDeviation="8" result="blur"/>
    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
  </filter>
</defs>

<!-- Background -->
<rect width="1200" height="630" fill="url(#bg)"/>

<!-- Dot texture -->
%s

<!-- Divider -->
<line x1="640" y1="60" x2="640" y2="570" stroke="white" stroke-width="1" opacity="0.07"/>

<!-- Board glow halo -->
<ellipse cx="900" cy="315" rx="290" ry="230" fill="%s" opacity="0.35" filter="url(#glow)"/>

<!-- Board -->
<g transform="translate(900,315) rotate(-8)" filter="url(#softGlow)">
%s
</g>

<!-- Left zone text -->
<!-- Site badge -->
<text x="60" y="72" font-size="14" font-weight="700" letter-spacing="5" font-family="sans-serif" fill="white" opacity="0.45">PUZZLE PK</text>
<rect x="56" y="82" width="80" height="2" fill="url(#accentGrad)" opacity="0.6" rx="1"/>

<!-- EN Title -->
%s

<!-- ZH Title -->
%s

<!-- Description -->
%s

<!-- Date -->
<text x="60" y="562" font-size="17" font-family="sans-serif" fill="%s" opacity="0.75">%s</text>

<!-- Game type badge -->
<rect x="440" y="544" width="160" height="30" fill="%s" fill-opacity="0.15" stroke="%s" stroke-width="1" stroke-opacity="0.4" rx="15"/>
<text x="520" y="559" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="700" letter-spacing="2" font-family="sans-serif" fill="%s" opacity="0.8">%s</text>

<!-- Bottom accent strip -->
<rect x="0" y="600" width="1200" height="30" fill="url(#accentGrad)" opacity="0.75"/>
<rect x="0" y="598" width="1200" height="2" fill="url(#accentGrad)" opacity="0.4"/>

</svg>`,
		theme.accFrom, theme.accTo,
		theme.accFrom,
		dotTexture(),
		theme.bgAccent,
		board,
		titleText,
		zhText,
		descText,
		theme.accFrom, dateStr,
		theme.accFrom, theme.accFrom,
		theme.accFrom, theme.gameType,
	)

	return svg
}

func dotTexture() string {
	s := ""
	for row := 0; row < 9; row++ {
		for col := 0; col < 16; col++ {
			x := 40 + col*75
			y := 40 + row*70
			s += fmt.Sprintf(`<circle cx="%d" cy="%d" r="1" fill="white" opacity="0.04"/>`, x, y)
		}
	}
	return s
}
