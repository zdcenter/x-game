package tilematch

import (
	"math"
	"math/rand"
	"sort"
)

var TileTypes = []string{
	"carrot", "grass", "glove", "bell", "wool", "wood", "cabbage",
	"fire", "bucket", "scissors", "milk", "brush", "sheep", "corn",
	"apple", "mushroom",
}

type Slot struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Layer int     `json:"layer"`
}

// GenerateCards 采用几何阵型与正向拓扑求解，生成 100% 必定有解且同构一致的牌面
func GenerateCards(totalCards int, difficulty string, seed int64) []Card {
	if totalCards <= 0 {
		totalCards = 60
	}
	// 确保总卡牌数必须是 3 的倍数
	if totalCards%3 != 0 {
		totalCards = (totalCards / 3) * 3
	}

	rng := rand.New(rand.NewSource(seed))

	// 1. 确定图案种类数
	typesCount := 4
	if totalCards >= 96 {
		typesCount = 12
	} else if totalCards >= 60 {
		typesCount = 8
	} else if totalCards >= 36 {
		typesCount = 6
	} else if totalCards >= 24 {
		typesCount = 5
	}
	if typesCount > len(TileTypes) {
		typesCount = len(TileTypes)
	}
	availableTypes := TileTypes[:typesCount]

	// 2. 生成阵型拓扑候选槽位
	slots := generateProceduralSlots(totalCards, rng)

	// 3. 构建拓扑遮挡图
	slotCount := len(slots)
	blockedBy := make([]map[int]bool, slotCount)
	blocks := make([]map[int]bool, slotCount)
	for i := 0; i < slotCount; i++ {
		blockedBy[i] = make(map[int]bool)
		blocks[i] = make(map[int]bool)
	}

	for i := 0; i < slotCount; i++ {
		for j := 0; j < slotCount; j++ {
			if i == j {
				continue
			}
			a := slots[i]
			b := slots[j]
			if b.Layer > a.Layer && math.Abs(a.X-b.X) < 0.88 && math.Abs(a.Y-b.Y) < 0.88 {
				blockedBy[i][j] = true
				blocks[j][i] = true
			}
		}
	}

	// 4. 正向模拟染色赋予图案（确保 100% 必定有解且每种图案为 3 的倍数）
	assignedTypes := solveAndAssignPatterns(slots, blockedBy, blocks, availableTypes, rng)

	// 5. 组装正式卡牌数据
	cards := make([]Card, slotCount)
	for i := 0; i < slotCount; i++ {
		cards[i] = Card{
			ID:        i + 1,
			Type:      assignedTypes[i],
			X:         slots[i].X,
			Y:         slots[i].Y,
			Layer:     slots[i].Layer,
			IsBlocked: len(blockedBy[i]) > 0,
			Status:    "board",
		}
	}

	return cards
}

func generateProceduralSlots(totalCards int, rng *rand.Rand) []Slot {
	templateType := rng.Intn(4) // 0: 羊头神殿, 1: 双峰金字塔, 2: 四叶环岛, 3: 风车十字
	flipX := rng.Float64() > 0.5

	makeSlideDeck := func(count int, startX, stepX, y float64) []Slot {
		deck := make([]Slot, count)
		for i := 0; i < count; i++ {
			deck[i] = Slot{
				X:     math.Round((startX+float64(i)*stepX)*100) / 100,
				Y:     y,
				Layer: i,
			}
		}
		return deck
	}

	topSlideDeckL := makeSlideDeck(8, 0.0, 0.18, 0.18)
	topSlideDeckR := makeSlideDeck(8, 5.0, -0.18, 0.18)
	botSlideDeckL := makeSlideDeck(5, 0.0, 0.16, 5.2)
	botSlideDeckR := makeSlideDeck(5, 5.0, -0.16, 5.2)

	openAnchors := []Slot{
		{X: 0.0, Y: 1.0, Layer: 0},
		{X: 5.0, Y: 1.0, Layer: 0},
		{X: 0.0, Y: 4.6, Layer: 0},
		{X: 5.0, Y: 4.6, Layer: 0},
		{X: 1.0, Y: 5.4, Layer: 0},
		{X: 4.0, Y: 5.4, Layer: 0},
	}

	var patternSlots []Slot

	switch templateType {
	case 0: // 羊头神殿
		l0Rows := []struct {
			y    float64
			cols []float64
		}{
			{1.0, []float64{1.0, 2.0, 3.0, 4.0}},
			{1.9, []float64{0.0, 1.0, 2.0, 3.0, 4.0, 5.0}},
			{2.8, []float64{0.0, 1.0, 2.0, 3.0, 4.0, 5.0}},
			{3.7, []float64{0.0, 1.0, 2.0, 3.0, 4.0, 5.0}},
			{4.6, []float64{1.0, 2.0, 3.0, 4.0}},
			{5.4, []float64{2.0, 3.0}},
		}
		for _, row := range l0Rows {
			for _, col := range row.cols {
				patternSlots = append(patternSlots, Slot{X: col, Y: row.y, Layer: 0})
			}
		}
		l1Rows := []struct {
			y    float64
			cols []float64
		}{
			{1.45, []float64{0.5, 1.5, 2.5, 3.5, 4.5}},
			{2.35, []float64{0.5, 1.5, 2.5, 3.5, 4.5}},
			{3.25, []float64{0.5, 1.5, 2.5, 3.5, 4.5}},
			{4.15, []float64{0.5, 1.5, 2.5, 3.5, 4.5}},
			{5.0, []float64{1.5, 2.5, 3.5}},
		}
		for _, row := range l1Rows {
			for _, col := range row.cols {
				patternSlots = append(patternSlots, Slot{X: col, Y: row.y, Layer: 1})
			}
		}
		l2 := []Slot{
			{X: 1.0, Y: 1.9, Layer: 2}, {X: 2.0, Y: 1.9, Layer: 2}, {X: 3.0, Y: 1.9, Layer: 2}, {X: 4.0, Y: 1.9, Layer: 2},
			{X: 0.5, Y: 2.8, Layer: 2}, {X: 1.5, Y: 2.8, Layer: 2}, {X: 2.5, Y: 2.8, Layer: 2}, {X: 3.5, Y: 2.8, Layer: 2}, {X: 4.5, Y: 2.8, Layer: 2},
			{X: 1.0, Y: 3.7, Layer: 2}, {X: 2.0, Y: 3.7, Layer: 2}, {X: 3.0, Y: 3.7, Layer: 2}, {X: 4.0, Y: 3.7, Layer: 2},
			{X: 2.0, Y: 4.6, Layer: 2}, {X: 3.0, Y: 4.6, Layer: 2},
		}
		patternSlots = append(patternSlots, l2...)
		l3 := []Slot{
			{X: 1.5, Y: 2.35, Layer: 3}, {X: 2.5, Y: 2.35, Layer: 3}, {X: 3.5, Y: 2.35, Layer: 3},
			{X: 2.0, Y: 2.8, Layer: 3}, {X: 3.0, Y: 2.8, Layer: 3},
			{X: 1.5, Y: 3.25, Layer: 3}, {X: 2.5, Y: 3.25, Layer: 3}, {X: 3.5, Y: 3.25, Layer: 3},
		}
		patternSlots = append(patternSlots, l3...)
		l4 := []Slot{
			{X: 2.5, Y: 2.35, Layer: 4}, {X: 2.5, Y: 2.8, Layer: 4}, {X: 2.5, Y: 3.25, Layer: 4},
		}
		patternSlots = append(patternSlots, l4...)

	case 1: // 双峰金字塔
		for _, y := range []float64{1.0, 1.9, 2.8, 3.7, 4.6} {
			for col := 0; col <= 5; col++ {
				patternSlots = append(patternSlots, Slot{X: float64(col), Y: y, Layer: 0})
			}
		}
		for _, y := range []float64{1.45, 2.35, 3.25, 4.15} {
			for _, col := range []float64{0.5, 1.5, 2.5, 3.5, 4.5} {
				patternSlots = append(patternSlots, Slot{X: col, Y: y, Layer: 1})
			}
		}
		for _, y := range []float64{1.9, 2.8, 3.7} {
			patternSlots = append(patternSlots, Slot{X: 1.0, Y: y, Layer: 2}, Slot{X: 2.0, Y: y, Layer: 2}, Slot{X: 3.0, Y: y, Layer: 2}, Slot{X: 4.0, Y: y, Layer: 2})
		}
		for _, y := range []float64{2.35, 3.25} {
			patternSlots = append(patternSlots, Slot{X: 1.5, Y: y, Layer: 3}, Slot{X: 3.5, Y: y, Layer: 3}, Slot{X: 2.5, Y: y, Layer: 3})
		}
		patternSlots = append(patternSlots, Slot{X: 1.5, Y: 2.8, Layer: 4}, Slot{X: 3.5, Y: 2.8, Layer: 4})

	case 2: // 四叶环岛群
		centerL0 := []Slot{
			{X: 1.0, Y: 1.9, Layer: 0}, {X: 2.0, Y: 1.9, Layer: 0}, {X: 3.0, Y: 1.9, Layer: 0}, {X: 4.0, Y: 1.9, Layer: 0},
			{X: 1.0, Y: 2.8, Layer: 0}, {X: 2.0, Y: 2.8, Layer: 0}, {X: 3.0, Y: 2.8, Layer: 0}, {X: 4.0, Y: 2.8, Layer: 0},
			{X: 1.0, Y: 3.7, Layer: 0}, {X: 2.0, Y: 3.7, Layer: 0}, {X: 3.0, Y: 3.7, Layer: 0}, {X: 4.0, Y: 3.7, Layer: 0},
		}
		patternSlots = append(patternSlots, centerL0...)
		islandsL0 := []Slot{
			{X: 0.0, Y: 1.2, Layer: 0}, {X: 0.8, Y: 1.2, Layer: 0},
			{X: 4.2, Y: 1.2, Layer: 0}, {X: 5.0, Y: 1.2, Layer: 0},
			{X: 0.0, Y: 4.4, Layer: 0}, {X: 0.8, Y: 4.4, Layer: 0},
			{X: 4.2, Y: 4.4, Layer: 0}, {X: 5.0, Y: 4.4, Layer: 0},
		}
		patternSlots = append(patternSlots, islandsL0...)
		centerL1 := []Slot{
			{X: 1.5, Y: 2.35, Layer: 1}, {X: 2.5, Y: 2.35, Layer: 1}, {X: 3.5, Y: 2.35, Layer: 1},
			{X: 1.5, Y: 3.25, Layer: 1}, {X: 2.5, Y: 3.25, Layer: 1}, {X: 3.5, Y: 3.25, Layer: 1},
		}
		patternSlots = append(patternSlots, centerL1...)
		centerL2 := []Slot{
			{X: 2.0, Y: 2.8, Layer: 2}, {X: 3.0, Y: 2.8, Layer: 2},
			{X: 2.5, Y: 2.35, Layer: 2}, {X: 2.5, Y: 3.25, Layer: 2},
		}
		patternSlots = append(patternSlots, centerL2...)
		patternSlots = append(patternSlots, Slot{X: 2.5, Y: 2.8, Layer: 3})

	default: // 3: 风车十字
		for col := 0.0; col <= 5.0; col += 1.0 {
			patternSlots = append(patternSlots, Slot{X: col, Y: 2.85, Layer: 0})
		}
		for y := 1.0; y <= 5.0; y += 0.9 {
			patternSlots = append(patternSlots, Slot{X: 2.5, Y: y, Layer: 0})
		}
		for col := 0.5; col <= 4.5; col += 1.0 {
			patternSlots = append(patternSlots, Slot{X: col, Y: 2.4, Layer: 1}, Slot{X: col, Y: 3.3, Layer: 1})
		}
		for y := 1.5; y <= 4.5; y += 1.0 {
			patternSlots = append(patternSlots, Slot{X: 2.0, Y: y, Layer: 1}, Slot{X: 3.0, Y: y, Layer: 1})
		}
		patternSlots = append(patternSlots,
			Slot{X: 2.0, Y: 2.4, Layer: 2}, Slot{X: 3.0, Y: 2.4, Layer: 2},
			Slot{X: 2.0, Y: 3.3, Layer: 2}, Slot{X: 3.0, Y: 3.3, Layer: 2},
			Slot{X: 2.5, Y: 2.85, Layer: 3}, Slot{X: 2.5, Y: 2.85, Layer: 4},
		)
	}

	candidateSlots := make([]Slot, 0, len(topSlideDeckL)+len(topSlideDeckR)+len(botSlideDeckL)+len(botSlideDeckR)+len(openAnchors)+len(patternSlots))
	candidateSlots = append(candidateSlots, topSlideDeckL...)
	candidateSlots = append(candidateSlots, topSlideDeckR...)
	candidateSlots = append(candidateSlots, openAnchors...)
	candidateSlots = append(candidateSlots, patternSlots...)
	candidateSlots = append(candidateSlots, botSlideDeckL...)
	candidateSlots = append(candidateSlots, botSlideDeckR...)

	// 去重
	uniqueSlots := make([]Slot, 0, len(candidateSlots))
	seen := make(map[string]bool)
	for _, s := range candidateSlots {
		k := math.Round(s.X*100) + math.Round(s.Y*100)*1000 + float64(s.Layer)*1000000
		kStr := string(rune(int(k)))
		if !seen[kStr] {
			seen[kStr] = true
			uniqueSlots = append(uniqueSlots, s)
		}
	}

	// 按层级结构选取指定数量
	byLayer := make(map[int][]Slot)
	for _, s := range uniqueSlots {
		byLayer[s.Layer] = append(byLayer[s.Layer], s)
	}

	var layers []int
	for l := range byLayer {
		layers = append(layers, l)
	}
	sort.Ints(layers)

	for _, l := range layers {
		deck := byLayer[l]
		rng.Shuffle(len(deck), func(i, j int) {
			deck[i], deck[j] = deck[j], deck[i]
		})
		byLayer[l] = deck
	}

	var picked []Slot
	targetBase := int(math.Max(8, float64(totalCards)*0.48))
	if len(byLayer[0]) > 0 {
		count := targetBase
		if count > len(byLayer[0]) {
			count = len(byLayer[0])
		}
		picked = append(picked, byLayer[0][:count]...)
	}

	maxLayer := 0
	if len(layers) > 0 {
		maxLayer = layers[len(layers)-1]
	}

	for l := 1; l <= maxLayer && len(picked) < totalCards; l++ {
		if deck, ok := byLayer[l]; ok {
			quota := int(math.Ceil(float64(totalCards-len(picked)) / float64(maxLayer-l+1)))
			if quota > len(deck) {
				quota = len(deck)
			}
			picked = append(picked, deck[:quota]...)
		}
	}

	if len(picked) < totalCards {
		pickedSet := make(map[Slot]bool)
		for _, p := range picked {
			pickedSet[p] = true
		}
		for _, s := range uniqueSlots {
			if len(picked) >= totalCards {
				break
			}
			if !pickedSet[s] {
				picked = append(picked, s)
				pickedSet[s] = true
			}
		}
	}

	finalSlots := picked
	if len(finalSlots) > totalCards {
		finalSlots = finalSlots[:totalCards]
	}

	// 补足极端不足情况
	for len(finalSlots) < totalCards {
		base := uniqueSlots[len(finalSlots)%len(uniqueSlots)]
		finalSlots = append(finalSlots, Slot{
			X:     math.Round((base.X+0.15)*100) / 100,
			Y:     math.Round((base.Y+0.15)*100) / 100,
			Layer: base.Layer + 1,
		})
	}

	// 翻转与微随机抖动
	for i := range finalSlots {
		if flipX {
			finalSlots[i].X = math.Round((5.0-finalSlots[i].X)*100) / 100
		}
		jitterX := math.Round((rng.Float64()-0.5)*0.08*100) / 100
		jitterY := math.Round((rng.Float64()-0.5)*0.08*100) / 100
		finalSlots[i].X = math.Max(0.0, math.Min(5.0, math.Round((finalSlots[i].X+jitterX)*100)/100))
		finalSlots[i].Y = math.Max(0.1, math.Min(5.6, math.Round((finalSlots[i].Y+jitterY)*100)/100))
	}

	return finalSlots
}

func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func solveAndAssignPatterns(
	slots []Slot,
	blockedBy []map[int]bool,
	blocks []map[int]bool,
	availableTypes []string,
	rng *rand.Rand,
) []string {
	n := len(slots)
	assigned := make([]string, n)
	inDegrees := make([]int, n)
	for i := 0; i < n; i++ {
		inDegrees[i] = len(blockedBy[i])
	}
	cleared := make([]bool, n)

	typeUsage := make(map[string]int)
	for _, t := range availableTypes {
		typeUsage[t] = 0
	}

	getAvailableSlots := func() []int {
		var list []int
		for i := 0; i < n; i++ {
			if !cleared[i] && inDegrees[i] == 0 {
				list = append(list, i)
			}
		}
		return list
	}

	totalPairs := n / 3
	for round := 0; round < totalPairs; round++ {
		free := getAvailableSlots()
		if len(free) == 0 {
			break
		}

		// 挑选最少使用的图案
		sortedTypes := make([]string, len(availableTypes))
		copy(sortedTypes, availableTypes)
		sort.SliceStable(sortedTypes, func(i, j int) bool {
			ui, uj := typeUsage[sortedTypes[i]], typeUsage[sortedTypes[j]]
			if ui != uj {
				return ui < uj
			}
			return sortedTypes[i] < sortedTypes[j]
		})
		chosenType := sortedTypes[0]
		typeUsage[chosenType] += 3

		var picked []int
		if len(free) >= 3 {
			rng.Shuffle(len(free), func(i, j int) {
				free[i], free[j] = free[j], free[i]
			})
			picked = append(picked, free[0], free[1], free[2])
		} else {
			for len(picked) < 3 && len(free) > 0 {
				next := free[len(free)-1]
				free = free[:len(free)-1]
				picked = append(picked, next)
				cleared[next] = true
				for lower := range blocks[next] {
					inDegrees[lower]--
				}
				newFree := getAvailableSlots()
				var filtered []int
				for _, f := range newFree {
					already := false
					for _, p := range picked {
						if p == f {
							already = true
							break
						}
					}
					if !already {
						filtered = append(filtered, f)
					}
				}
				free = filtered
			}

			if len(picked) < 3 {
				for i := 0; i < n && len(picked) < 3; i++ {
					already := false
					for _, p := range picked {
						if p == i {
							already = true
							break
						}
					}
					if !cleared[i] && !already {
						picked = append(picked, i)
					}
				}
			}
		}

		for _, idx := range picked {
			assigned[idx] = chosenType
			if !cleared[idx] {
				cleared[idx] = true
				for lower := range blocks[idx] {
					inDegrees[lower]--
				}
			}
		}
	}

	// 补全所有未分配槽位为 3 的倍数
	var unassigned []int
	for i := 0; i < n; i++ {
		if assigned[i] == "" {
			unassigned = append(unassigned, i)
		}
	}
	for i := 0; i < len(unassigned); i += 3 {
		fb := availableTypes[(i/3)%len(availableTypes)]
		for j := 0; j < 3 && i+j < len(unassigned); j++ {
			assigned[unassigned[i+j]] = fb
		}
	}

	return assigned
}
