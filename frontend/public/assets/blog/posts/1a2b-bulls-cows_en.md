# Mastering 1A2B (Bulls and Cows): Strategy, Algorithms, and the Science of Deduction

1A2B — known internationally as Bulls and Cows, and also as Mastermind (in peg-colour form) — is one of the most elegant information theory puzzles ever devised. In its classic 4-digit form, you are trying to guess a 4-digit secret number (all digits unique, no zeros) in as few guesses as possible, using only the feedback you receive each round.

The feedback is deceptively simple:
- **A** (Bulls): How many digits are correct AND in the correct position.
- **B** (Cows): How many digits are correct but in the WRONG position.

For example, if the secret number is `4271` and you guess `1234`:
- The `2` is correct and in the correct position (position 2) → **1A**
- The `1` and `4` are correct but in wrong positions → **2B**
- Result: `1A2B`

From this single response, you need to extract maximum information to converge on the answer. Here is how to master that process.

## The Information-Theoretic View

Before diving into strategies, it helps to understand what 1A2B fundamentally is: an **information partitioning game**. Each guess you make divides all possible remaining secret numbers into groups, based on what feedback each would produce. The ideal guess is the one that makes these groups as equal in size as possible — minimising the worst-case number of remaining possibilities after you receive any response.

This is the same principle behind optimal binary search. You always want to cut the possibility space in half (or better), not just eliminate a few options.

There are exactly 5,040 possible 4-digit numbers with no repeated digits and no zeros (9 × 8 × 7 × 6 = 3,024 if we start from `1023` with zeros allowed, or 9 × 8 × 7 × 6 = 3,024 with `1` through `9`). A perfect player using information-optimal strategies can guarantee finding the answer in **5 guesses or fewer**.

## Stage 1: The Opening Guess

Your first guess should be designed to maximise information, not to make an intuitive "lucky" stab. Consider `1234` as an opening:

After `1234`, the response partitions all 5,040 possibilities into groups. No matter what response you receive, you will at minimum learn which (if any) of `1`, `2`, `3`, `4` are in the secret number and which positions they occupy.

Experienced players often use fixed opening sequences (like `1234` followed by `5678` if the response to `1234` is `0A0B`) to quickly determine which digits are in play before worrying about their exact positions.

## Stage 2: Digit Identification Phase

In the early rounds, your primary goal is to identify **which 4 digits appear in the secret number** (from the digits 1–9). With the digits identified, the problem collapses into a positional arrangement puzzle — which is far easier.

**Strategy**: Choose guesses that collectively cover all 9 possible digits (1–9) in as few guesses as possible. Guessing `1234` and then `5678` covers 8 digits in just 2 guesses. The combined feedback tells you definitively which digits are present:

- Any digit appearing in a "0A0B" response is **not** in the secret.
- Any digit contributing to A or B counts **is** in the secret.

After 2 strategic guesses, you typically know exactly which 4 digits are in play.

## Stage 3: Position Resolution

Once you know the digits, you need to determine their positions. With 4 known digits, there are at most 4! = 24 possible arrangements. Each guess eliminates a large fraction of these.

**Key technique — Systematic Transposition**: If you know the digits are `{1, 2, 7, 9}` and your guess `1279` returns `2A2B`, you know 2 digits are correctly placed and 2 are swapped. Systematically swap pairs of suspected wrong-position digits until the arrangement locks into place.

**Exploit pure A responses**: A guess that returns `4A0B` is the secret — you are done. A response of `3A0B` means exactly one digit is misplaced. Since you know which 3 are correct, the misplaced one must swap into the remaining position.

## Advanced Technique: Constraint Tracking

Maintain a running list of constraints after each guess. Every response rules out an enormous number of arrangements. The key is to be systematic rather than intuitive:

1. **Positive constraints**: "Digit 7 IS in the number." (from any A or B count)
2. **Negative constraints**: "Digit 3 is NOT in the number." (from 0A0B responses involving 3)
3. **Positional constraints**: "Digit 5 is NOT in position 2." (from B contributions)
4. **Fixed constraints**: "Digit 9 IS in position 3." (from A contributions)

By tracking these constraints methodically, you can verify each candidate guess against everything you know before making it. Any guess that is inconsistent with a known constraint is wasted information.

## The Minimax Algorithm (How Computers Do It)

If you want to understand the truly optimal approach, it is the **minimax algorithm**:

1. Generate all remaining possible secrets (consistent with all prior feedback).
2. For each candidate guess, simulate what response each possible secret would produce.
3. Count the size of the largest response group (worst case).
4. Choose the guess that minimises this worst-case group size.

This approach guarantees that you always reduce the possibility space as aggressively as possible. Computers using minimax can solve any 1A2B puzzle in at most 5 guesses, with an average of around 4.3 guesses.

You do not need to run the full algorithm mentally, but internalising its principle — "choose guesses that hurt you least in the worst case" — will significantly improve your intuitive play.

## Reading Feedback Like a Detective

Think of each 1A2B response as evidence in a detective case. Good detectives do not jump to conclusions from a single clue; they build a web of mutually reinforcing evidence.

**"0A0B"** is not bad news — it is *excellent* information. It eliminates every digit in your guess from consideration.

**"4A0B"** means you have solved the puzzle. 

**"0A4B"** is one of the most tantalising responses: all 4 of your digits are correct, but all 4 are in the wrong position. There is exactly one arrangement that maps to this feedback — find it.

**Avoid confirmation bias**: If you have a strong guess in mind, verify it against *all* previous feedback, not just the most recent. It is easy to check only the last clue and miss an earlier contradiction.

## PK Mode Strategy: Speed vs. Optimality

In Puzzle PK's competitive 1A2B PK mode, your opponent is racing against you in real time. The optimal strategy shifts slightly:

- **Speed matters more than optimality**: Making a fast 80%-optimal guess is often better than taking 10 extra seconds to compute the perfect one.
- **Watch your opponent**: In PK mode, you can observe how many guesses your opponent has made. If they are on guess 3 and you are on guess 2, take a more conservative (information-maximising) approach. If they are ahead, consider a slightly riskier "lucky guess" that could end the game instantly.
- **Pattern recognition over calculation**: At high skill levels, experienced players have memorised common feedback patterns and their implications. Practise until the "digit identification phase" becomes automatic.

## Practice Recommendations

**Start with 3-digit practice**: Try 3A0B (3 unique digits from 1–7) before moving to the full 4-digit game. The strategy is identical but the reduced complexity lets you internalise the feedback interpretation without cognitive overload.

**Self-analyse your guesses**: After each game, review your guess sequence. Could any guess have been replaced by one with higher information value? This retrospective analysis is the fastest path to improvement.

**Play regularly**: The pattern-matching instincts and constraint-tracking habits develop best through repetition. Even 5–10 games per week will produce noticeable improvement within a month.

Ready to test your deductive skills? [Play 1A2B (Codebreaker) on Puzzle PK](/games/codebreaker) — challenge yourself in solo mode or face a real opponent in real-time PK!
