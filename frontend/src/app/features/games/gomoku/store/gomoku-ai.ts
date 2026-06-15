import { GameDifficulty, GameMode, GameStatus } from '../../../../core/models/game.model';
export type GomokuColor = 0 | 1 | 2; // 0=Empty, 1=Black, 2=White

export class GomokuAI {
  private size = 15;
  private maxDepth = 2; // Default for Medium. Easy=1, Hard=4

  constructor(private myColor: GomokuColor, difficulty: string) {
    if (difficulty === GameDifficulty.Easy) {
      this.maxDepth = 1;
    } else if (difficulty === GameDifficulty.Medium) {
      this.maxDepth = 2;
    } else if (difficulty === GameDifficulty.Hard) {
      this.maxDepth = 4;
    }
  }

  // Returns the best move [y, x]
  public getBestMove(board: GomokuColor[][]): [number, number] {
    const validMoves = this.generateMoves(board);
    if (validMoves.length === 0) {
      return [Math.floor(this.size / 2), Math.floor(this.size / 2)];
    }

    if (validMoves.length === 1 && validMoves[0][0] === -1) {
      // First move on empty board
      return [Math.floor(this.size / 2), Math.floor(this.size / 2)];
    }

    let bestScore = -Infinity;
    let bestMove = validMoves[0];
    let alpha = -Infinity;
    let beta = Infinity;

    for (const move of validMoves) {
      board[move[0]][move[1]] = this.myColor;
      // We do a minimax search
      const score = this.minimax(board, this.maxDepth - 1, alpha, beta, false);
      board[move[0]][move[1]] = 0;

      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
    }

    return bestMove;
  }

  private minimax(board: GomokuColor[][], depth: number, alpha: number, beta: number, isMaximizing: boolean): number {
    const currentScore = this.evaluateBoard(board);
    
    // If win/loss or depth reached
    if (depth === 0 || Math.abs(currentScore) >= 1000000) {
      return currentScore;
    }

    const validMoves = this.generateMoves(board);
    
    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of validMoves) {
        board[move[0]][move[1]] = this.myColor;
        const ev = this.minimax(board, depth - 1, alpha, beta, false);
        board[move[0]][move[1]] = 0;
        maxEval = Math.max(maxEval, ev);
        alpha = Math.max(alpha, ev);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      const opponentColor = this.myColor === 1 ? 2 : 1;
      for (const move of validMoves) {
        board[move[0]][move[1]] = opponentColor;
        const ev = this.minimax(board, depth - 1, alpha, beta, true);
        board[move[0]][move[1]] = 0;
        minEval = Math.min(minEval, ev);
        beta = Math.min(beta, ev);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  // Generate sensible moves (only consider empty cells adjacent to existing pieces to save time)
  private generateMoves(board: GomokuColor[][]): [number, number][] {
    const moves: [number, number][] = [];
    let hasPieces = false;

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (board[y][x] === 0) {
          if (this.hasAdjacent(board, y, x)) {
            moves.push([y, x]);
          }
        } else {
          hasPieces = true;
        }
      }
    }

    // If board is empty, return a dummy move so we play in the center
    if (!hasPieces) {
      return [[-1, -1]];
    }
    
    // To optimize Alpha-Beta, we should theoretically sort moves based on a shallow evaluation
    // For now, returning unsorted valid moves
    return moves;
  }

  private hasAdjacent(board: GomokuColor[][], y: number, x: number): boolean {
    const dirs = [[-1,-1], [-1,0], [-1,1], [0,-1], [0,1], [1,-1], [1,0], [1,1]];
    const dist = 2; // Consider within 2 blocks
    for (let dy = -dist; dy <= dist; dy++) {
      for (let dx = -dist; dx <= dist; dx++) {
        if (dy === 0 && dx === 0) continue;
        const ny = y + dy;
        const nx = x + dx;
        if (ny >= 0 && ny < this.size && nx >= 0 && nx < this.size) {
          if (board[ny][nx] !== 0) return true;
        }
      }
    }
    return false;
  }

  private evaluateBoard(board: GomokuColor[][]): number {
    const opponentColor = this.myColor === 1 ? 2 : 1;
    let myScore = this.evaluateLines(board, this.myColor);
    let opponentScore = this.evaluateLines(board, opponentColor);
    
    // Defensive weighting: if opponent has a high score (threat), we must block it
    return myScore - (opponentScore * 1.1); 
  }

  private evaluateLines(board: GomokuColor[][], color: GomokuColor): number {
    let score = 0;
    const size = this.size;
    
    const countConsecutive = (y: number, x: number, dy: number, dx: number) => {
      let count = 0;
      let blocked = 0;
      let empty = 0;

      // Check backward
      let by = y - dy;
      let bx = x - dx;
      if (by < 0 || by >= size || bx < 0 || bx >= size || board[by][bx] !== 0) {
        if (by >= 0 && by < size && bx >= 0 && bx < size && board[by][bx] !== color) blocked++;
        else blocked++; // wall
      } else {
        empty++;
      }

      // Check forward
      let fy = y;
      let fx = x;
      while (fy >= 0 && fy < size && fx >= 0 && fx < size && board[fy][fx] === color) {
        count++;
        fy += dy;
        fx += dx;
      }

      if (fy < 0 || fy >= size || fx < 0 || fx >= size || board[fy][fx] !== 0) {
        if (fy >= 0 && fy < size && fx >= 0 && fx < size && board[fy][fx] !== color) blocked++;
        else blocked++; // wall
      } else {
        empty++;
      }

      return { count, blocked };
    };

    const evaluatePattern = (count: number, blocked: number) => {
      if (count >= 5) return 1000000;
      if (count === 4) {
        if (blocked === 0) return 100000; // Open 4
        if (blocked === 1) return 10000;  // Half-open 4
      }
      if (count === 3) {
        if (blocked === 0) return 5000;   // Open 3
        if (blocked === 1) return 100;    // Half-open 3
      }
      if (count === 2) {
        if (blocked === 0) return 50;
        if (blocked === 1) return 10;
      }
      if (count === 1) {
        if (blocked === 0) return 5;
      }
      return 0;
    };

    // Horizontal
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (board[y][x] === color) {
          // Horizontal
          if (x === 0 || board[y][x-1] !== color) {
            const { count, blocked } = countConsecutive(y, x, 0, 1);
            score += evaluatePattern(count, blocked);
          }
          // Vertical
          if (y === 0 || board[y-1][x] !== color) {
            const { count, blocked } = countConsecutive(y, x, 1, 0);
            score += evaluatePattern(count, blocked);
          }
          // Diagonal \
          if (y === 0 || x === 0 || board[y-1][x-1] !== color) {
            const { count, blocked } = countConsecutive(y, x, 1, 1);
            score += evaluatePattern(count, blocked);
          }
          // Diagonal /
          if (y === 0 || x === size - 1 || board[y-1][x+1] !== color) {
            const { count, blocked } = countConsecutive(y, x, 1, -1);
            score += evaluatePattern(count, blocked);
          }
        }
      }
    }

    return score;
  }
}
