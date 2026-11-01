/// <reference lib="webworker" />
import { GomokuAI, type GomokuColor } from './gomoku-ai';

addEventListener('message', ({ data }: { data: { board: GomokuColor[][]; myColor: GomokuColor; difficulty: string } }) => {
  const { board, myColor, difficulty } = data;
  const ai = new GomokuAI(myColor, difficulty);
  const bestMove = ai.getBestMove(board);
  postMessage({ bestMove });
});
