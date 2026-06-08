const fs = require('fs');
const path = require('path');

const EPSILON = 1e-6;

function solve24(nums, allowFractions) {
    const results = [];
    const search = (currentArr) => {
        if (currentArr.length === 1) {
            if (Math.abs(currentArr[0].val - 24) < EPSILON) {
                results.push(currentArr[0].exp);
            }
            return;
        }

        for (let i = 0; i < currentArr.length; i++) {
            for (let j = 0; j < currentArr.length; j++) {
                if (i === j) continue;
                
                const nextArr = [];
                for (let k = 0; k < currentArr.length; k++) {
                    if (k !== i && k !== j) {
                        nextArr.push(currentArr[k]);
                    }
                }

                const a = currentArr[i];
                const b = currentArr[j];

                // +
                nextArr.push({ val: a.val + b.val, exp: `(${a.exp}+${b.exp})` });
                search(nextArr);
                nextArr.pop();

                // -
                nextArr.push({ val: a.val - b.val, exp: `(${a.exp}-${b.exp})` });
                search(nextArr);
                nextArr.pop();

                // *
                nextArr.push({ val: a.val * b.val, exp: `(${a.exp}*${b.exp})` });
                search(nextArr);
                nextArr.pop();

                // /
                if (Math.abs(b.val) > EPSILON) {
                    if (!allowFractions) {
                        // Check if it's an integer division
                        // To avoid floating point issues, we check if Math.round(a.val / b.val) * b.val === a.val
                        const div = a.val / b.val;
                        if (Math.abs(Math.round(div) - div) < EPSILON) {
                            nextArr.push({ val: div, exp: `(${a.exp}/${b.exp})` });
                            search(nextArr);
                            nextArr.pop();
                        }
                    } else {
                        nextArr.push({ val: a.val / b.val, exp: `(${a.exp}/${b.exp})` });
                        search(nextArr);
                        nextArr.pop();
                    }
                }
            }
        }
    };

    const initialArr = nums.map(n => ({ val: n, exp: n.toString() }));
    search(initialArr);
    
    // Deduplicate expressions based on evaluation pattern if needed, but here we just need count
    return new Set(results).size;
}

let allSolvable = [];

for (let a = 1; a <= 13; a++) {
    for (let b = a; b <= 13; b++) {
        for (let c = b; c <= 13; c++) {
            for (let d = c; d <= 13; d++) {
                const cards = [a, b, c, d];
                const integerSolutionsCount = solve24(cards, false);
                if (integerSolutionsCount > 0) {
                    allSolvable.push({ cards: cards.join(','), count: integerSolutionsCount, fractionOnly: false });
                } else {
                    const fractionSolutionsCount = solve24(cards, true);
                    if (fractionSolutionsCount > 0) {
                        allSolvable.push({ cards: cards.join(','), count: 0, fractionOnly: true });
                    }
                }
            }
        }
    }
}

// Sort by number of solutions descending (easier first)
// For fraction only, put them at the very end
allSolvable.sort((a, b) => {
    if (a.fractionOnly && !b.fractionOnly) return 1;
    if (!a.fractionOnly && b.fractionOnly) return -1;
    return b.count - a.count;
});

const total = allSolvable.length; // 1362
const p40 = Math.round(total * 0.40);
const p75 = Math.round(total * 0.75);
const p90 = Math.round(total * 0.90);

const easy = allSolvable.slice(0, p40).map(x => x.cards);
const medium = allSolvable.slice(p40, p75).map(x => x.cards);
const hard = allSolvable.slice(p75, p90).map(x => x.cards);
const expert = allSolvable.slice(p90).map(x => x.cards);

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

shuffleArray(easy);
shuffleArray(medium);
shuffleArray(hard);
shuffleArray(expert);

console.log(`Total Easy (初级): ${easy.length}`);
console.log(`Total Advanced (中级): ${medium.length}`);
console.log(`Total Hard (高级): ${hard.length}`);
console.log(`Total Expert (专业): ${expert.length}`);
console.log(`Total Solvable: ${easy.length + medium.length + hard.length + expert.length}`);

// Generate Go file
const goFileContent = `package db

import (
	"log"

	"github.com/x-game/backend/internal/domain"
)

func SeedMath24() {
	var count int64
	DB.Model(&domain.Math24Puzzle{}).Count(&count)
	// Force re-seed: if count != 1362, we will delete and re-insert
	if count != 1362 {
        log.Println("Re-seeding Math24 puzzles...")
        DB.Exec("DELETE FROM math24_puzzles")
        
		puzzles := []domain.Math24Puzzle{
${easy.map((c, i) => `\t\t\t{ID: "m24-easy-${i+1}", Difficulty: "easy", Cards: "${c}"},`).join('\n')}
${medium.map((c, i) => `\t\t\t{ID: "m24-medium-${i+1}", Difficulty: "medium", Cards: "${c}"},`).join('\n')}
${hard.map((c, i) => `\t\t\t{ID: "m24-hard-${i+1}", Difficulty: "hard", Cards: "${c}"},`).join('\n')}
${expert.map((c, i) => `\t\t\t{ID: "m24-expert-${i+1}", Difficulty: "expert", Cards: "${c}"},`).join('\n')}
		}
		
		DB.CreateInBatches(puzzles, 100)
		log.Println("Seeded 1362 Math24 puzzles")
	}
}
`;

fs.writeFileSync(path.join(__dirname, '../backend/pkg/db/postgres_math24.go'), goFileContent);
console.log('Successfully wrote to postgres_math24.go');
