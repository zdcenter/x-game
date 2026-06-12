# Mastering 1A2B (Bulls and Cows)

The classic code-breaking game 1A2B (often known in the West as Bulls and Cows) is a brilliant exercise in deductive reasoning. Your goal is to crack a secret 4-digit code (with no repeating digits) in as few guesses as possible. Here is how you can use algorithms and logic to win every time.

## 1. The Rules of Engagement
For every guess you make, the system gives you a clue in the format "X A Y B".
* **A (Bulls)**: The number of digits that are correct and in the correct position.
* **B (Cows)**: The number of digits that are part of the secret code, but in the wrong position.
* E.g., if the secret code is "1234" and you guess "1356", you get "1A1B" (1 is correct and in place, 3 is correct but misplaced).

## 2. The Opening Move
Your first guess is entirely blind. A common strategy is to pick four sequential numbers, such as "1234" or "0123". This immediately gives you a baseline. Depending on the response, you instantly know how many of those digits are part of the final answer.

## 3. Disjoint Sets Strategy
A highly effective method is to guess completely disjoint sets for your first two or three moves. For example, guess "1234", then "5678". By doing this, you have tested 8 out of the 10 possible digits. If "1234" yields 1A1B and "5678" yields 0A1B, you know that exactly 3 numbers from these sets are in the answer, which means the remaining 2 untested digits ("9" and "0") *must* be in the secret code!

## 4. The Elimination Method
Write down all possible numbers from 0 to 9. As you get clues, systematically cross out numbers that cannot possibly be in the answer. If a guess like "4567" returns "0A0B", you hit the jackpot! You can instantly eliminate 4, 5, 6, and 7 from all future guesses.

## 5. Permutation Testing
Once you know the 4 correct digits (e.g., you know the answer contains 1, 3, 5, 9 but don't know the order), start fixing one digit in place and swapping the others. Pay close attention to how the 'A' and 'B' count changes. If an 'A' turns into a 'B' after a swap, you know the original position of that digit was correct.

Sharpen your deductive skills today by playing 1A2B in our multiplayer arena!
