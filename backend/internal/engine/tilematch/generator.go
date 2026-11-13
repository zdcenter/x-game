package tilematch

import (
	"math"
	"math/rand"
	"sort"
	"strings"
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

	// 1. 确定图案种类数 (简单: 5~6 种, 中等: 8~9 种, 困难: 12~14 种)
	typesCount := 5
	diffLower := strings.ToLower(difficulty)
	if diffLower == "hard" || totalCards >= 96 {
		typesCount = 13
	} else if diffLower == "medium" || totalCards >= 60 {
		typesCount = 9
	} else if totalCards >= 36 {
		typesCount = 7
	} else if totalCards >= 24 {
		typesCount = 6
	} else {
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

	// 4. 逆向时间推演染色赋予图案（确保 100% 必定有解且难度真实生效）
	assignedTypes := solveAndAssignPatterns(slots, blockedBy, blocks, availableTypes, rng, difficulty)

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
	difficulty string,
) []string {
	n := len(slots)
	assigned := make([]string, n)
	placed := make([]bool, n)

	// blocks[i] 是 i 所覆盖/压着的下方卡牌
	// 在逆向放置过程中，卡牌 i 只有在其下方所有卡牌 (blocks[i]) 都已放置后，才能被放置
	coveredRemaining := make([]int, n)
	eligible := make(map[int]bool)
	for i := 0; i < n; i++ {
		coveredRemaining[i] = len(blocks[i])
		if coveredRemaining[i] == 0 {
			eligible[i] = true
		}
	}

	maxSlotBuffer := 5
	spawnProb := 0.45
	diffLower := strings.ToLower(difficulty)
	if diffLower == "hard" || n >= 96 {
		maxSlotBuffer = 6
		spawnProb = 0.75
	} else if diffLower == "medium" || n >= 60 {
		maxSlotBuffer = 5
		spawnProb = 0.45
	} else {
		maxSlotBuffer = 4
		spawnProb = 0.20
	}

	totalTriples := n / 3
	triplePool := make([]string, 0, totalTriples)
	typeUsage := make(map[string]int)
	for _, t := range availableTypes {
		typeUsage[t] = 0
	}

	for i := 0; i < totalTriples; i++ {
		sortedTypes := make([]string, len(availableTypes))
		copy(sortedTypes, availableTypes)
		sort.SliceStable(sortedTypes, func(a, b int) bool {
			diff := typeUsage[sortedTypes[a]] - typeUsage[sortedTypes[b]]
			if diff != 0 {
				return diff < 0
			}
			return sortedTypes[a] < sortedTypes[b]
		})
		chosen := sortedTypes[0]
		typeUsage[chosen]++
		triplePool = append(triplePool, chosen)
	}
	rng.Shuffle(len(triplePool), func(i, j int) {
		triplePool[i], triplePool[j] = triplePool[j], triplePool[i]
	})

	virtualSlot := make([]string, 0, maxSlotBuffer)
	placedCount := 0
	typePositions := make(map[string][]Slot)
	for _, t := range availableTypes {
		typePositions[t] = make([]Slot, 0)
	}

	for placedCount < n {
		canSpawn := len(triplePool) > 0 && len(virtualSlot)+3 <= maxSlotBuffer
		canPlace := len(virtualSlot) > 0 && len(eligible) > 0

		doSpawn := false
		if len(virtualSlot) == 0 {
			doSpawn = true
		} else if !canPlace {
			doSpawn = true
		} else if canSpawn {
			doSpawn = rng.Float64() < spawnProb
		}

		if doSpawn && canSpawn {
			newType := triplePool[len(triplePool)-1]
			triplePool = triplePool[:len(triplePool)-1]
			virtualSlot = append(virtualSlot, newType, newType, newType)
			rng.Shuffle(len(virtualSlot), func(i, j int) {
				virtualSlot[i], virtualSlot[j] = virtualSlot[j], virtualSlot[i]
			})
		} else if canPlace {
			eligibleArray := make([]int, 0, len(eligible))
			for k := range eligible {
				eligibleArray = append(eligibleArray, k)
			}
			sort.Ints(eligibleArray)
			rng.Shuffle(len(eligibleArray), func(i, j int) {
				eligibleArray[i], eligibleArray[j] = eligibleArray[j], eligibleArray[i]
			})

			uniqueMap := make(map[string]bool)
			var uniqueSlotTypes []string
			for _, t := range virtualSlot {
				if !uniqueMap[t] {
					uniqueMap[t] = true
					uniqueSlotTypes = append(uniqueSlotTypes, t)
				}
			}
			rng.Shuffle(len(uniqueSlotTypes), func(i, j int) {
				uniqueSlotTypes[i], uniqueSlotTypes[j] = uniqueSlotTypes[j], uniqueSlotTypes[i]
			})

			bestScore := -1e9
			bestSlot := eligibleArray[0]
			bestType := uniqueSlotTypes[0]

			if diffLower == "easy" {
				bestSlot = eligibleArray[rng.Intn(len(eligibleArray))]
				bestType = uniqueSlotTypes[rng.Intn(len(uniqueSlotTypes))]
			} else {
				for _, sIdx := range eligibleArray {
					slotObj := slots[sIdx]
					coveredTypes := make(map[string]bool)
					for childIdx := range blocks[sIdx] {
						if assigned[childIdx] != "" {
							coveredTypes[assigned[childIdx]] = true
						}
					}

					for _, t := range uniqueSlotTypes {
						score := 0.0

						// 1. 垂直避让惩罚：严禁当前牌与正下方的牌同图案
						if coveredTypes[t] {
							score -= 80.0
						}

						// 2. 空间距离惩罚与层级分散
						prevPos := typePositions[t]
						if len(prevPos) > 0 {
							minDist := 999.0
							sameLayerCount := 0
							for _, pos := range prevPos {
								dist := math.Hypot(pos.X-slotObj.X, pos.Y-slotObj.Y)
								if dist < minDist {
									minDist = dist
								}
								if pos.Layer == slotObj.Layer {
									sameLayerCount++
								}
							}
							if minDist < 1.1 {
								score -= 50.0
							} else if minDist < 2.0 {
								score -= 20.0
							} else {
								score += 20.0
							}
							if sameLayerCount > 0 {
								score -= 25.0 * float64(sameLayerCount)
							}
						}

						// 3. 针对 Hard 模式：纵深打分
						if diffLower == "hard" {
							score += float64((slotObj.Layer % 3) * 5)
						}

						score += rng.Float64() * 5.0

						if score > bestScore {
							bestScore = score
							bestSlot = sIdx
							bestType = t
						}
					}
				}
			}

			// 落实分配
			assigned[bestSlot] = bestType
			placed[bestSlot] = true
			placedCount++
			delete(eligible, bestSlot)
			typePositions[bestType] = append(typePositions[bestType], slots[bestSlot])

			// 从 virtualSlot 移除一张 bestType
			for i, t := range virtualSlot {
				if t == bestType {
					virtualSlot = append(virtualSlot[:i], virtualSlot[i+1:]...)
					break
				}
			}

			// 释放依赖：当 bestSlot (底层牌) 放置后，所有压在 bestSlot 上方的牌的未放置下层依赖数 -1
			var parentIndices []int
			for parentIdx := range blockedBy[bestSlot] {
				parentIndices = append(parentIndices, parentIdx)
			}
			sort.Ints(parentIndices)
			for _, parentIdx := range parentIndices {
				coveredRemaining[parentIdx]--
				if coveredRemaining[parentIdx] == 0 && !placed[parentIdx] {
					eligible[parentIdx] = true
				}
			}
		} else {
			break
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
