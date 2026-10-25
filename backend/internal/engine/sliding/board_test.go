package sliding

import (
	"testing"
)

func TestBoardMultiTileMove(t *testing.T) {
	b := NewBoard(4)
	if !b.CheckWin() {
		t.Fatal("Initial board should be in win state")
	}

	// Slide row: click on cell 13 (index 12).
	// Row 3: [13, 14, 15, 0] -> should become [0, 13, 14, 15], emptyIdx = 12
	if !b.Move(12) {
		t.Fatal("Move(12) should succeed for row multi-slide")
	}
	if b.EmptyIdx != 12 {
		t.Fatalf("Expected emptyIdx 12, got %d", b.EmptyIdx)
	}
	if b.Cells[12] != 0 || b.Cells[13] != 13 || b.Cells[14] != 14 || b.Cells[15] != 15 {
		t.Fatalf("Unexpected row content after slide: %v", b.Cells[12:16])
	}
	if b.Moves != 1 {
		t.Fatalf("Expected moves = 1, got %d", b.Moves)
	}

	// Slide column: click on cell 1 (index 0).
	// Column 0 has cells [1 (idx 0), 5 (idx 4), 9 (idx 8), 0 (idx 12)].
	// Target is idx 0. Empty is idx 12.
	// Should slide down: [0, 1, 5, 9] in column 0, emptyIdx becomes 0.
	if !b.Move(0) {
		t.Fatal("Move(0) should succeed for column multi-slide")
	}
	if b.EmptyIdx != 0 {
		t.Fatalf("Expected emptyIdx 0, got %d", b.EmptyIdx)
	}
	if b.Cells[0] != 0 || b.Cells[4] != 1 || b.Cells[8] != 5 || b.Cells[12] != 9 {
		t.Fatalf("Unexpected column content after slide: %d, %d, %d, %d", b.Cells[0], b.Cells[4], b.Cells[8], b.Cells[12])
	}

	// Clicking non-aligned cell should fail (e.g. Row 2 Col 2 = index 10 when empty is (0,0))
	if b.Move(10) {
		t.Fatal("Move(10) should fail when not in same row or column")
	}
}

func TestBoardShuffle(t *testing.T) {
	b := NewBoard(4)
	b.Shuffle(100)
	if b.CheckWin() {
		t.Fatal("Board should not be solved immediately after shuffle")
	}
	seen := make(map[int]bool)
	for _, val := range b.Cells {
		seen[val] = true
	}
	for i := 0; i <= 15; i++ {
		if !seen[i] {
			t.Fatalf("Missing cell value %d", i)
		}
	}
}
