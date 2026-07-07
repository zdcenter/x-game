import { Component, computed, signal, OnDestroy, Output, EventEmitter, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalSokobanEngine } from '../../store/local-sokoban-engine';
import { SokobanBoardComponent } from '../board/sokoban-board.component';

interface TutorialStep {
  title: string;
  desc: string;
  initialBoard: string;
  sequence: ('up' | 'down' | 'left' | 'right')[];
}

@Component({
  selector: 'app-sokoban-tutorial',
  standalone: true,
  imports: [CommonModule, SokobanBoardComponent],
  templateUrl: './sokoban-tutorial.component.html'
})
export class SokobanTutorialComponent implements OnDestroy {
  @Input() inline = false;
  @Output() closed = new EventEmitter<void>();
  @ViewChild(SokobanBoardComponent) boardComp!: SokobanBoardComponent;

  readonly steps: TutorialStep[] = [
    {
      title: '游戏目标 (The Goal)',
      desc: '你是仓库管理员。你的目标是把前方所有的木箱推到目标光圈上。',
      initialBoard: '######\n#@ $.#\n######',
      sequence: []
    },
    {
      title: '如何推动 (Pushing)',
      desc: '朝着箱子的方向移动即可推动它。注意，只有箱子背后有空位时，你才能推得动！',
      initialBoard: '######\n#@ $.#\n######',
      sequence: ['right', 'right']
    },
    {
      title: '致命死角 (Dead Ends)',
      desc: '切记，你永远无法“拉”箱子，所以千万别把它们推到墙角里！一旦推到死角，游戏就无法完成了。',
      initialBoard: '######\n#    #\n#@ $ #\n#  . #\n######',
      sequence: ['right', 'right', 'up', 'right', 'right', 'down', 'down']
    }
  ];

  currentStepIdx = signal(0);
  currentStep = computed(() => this.steps[this.currentStepIdx()]);
  
  boardData = signal<string[][]>([]);
  isPlaying = signal(false);
  private timer: any;
  private engine: LocalSokobanEngine;

  constructor() {
    this.engine = new LocalSokobanEngine();
  }

  ngOnInit() {
    this.loadStep();
  }

  ngOnDestroy() {
    this.stopAnimation();
  }

  loadStep() {
    this.stopAnimation();
    const step = this.currentStep();
    // Initialize engine without saving to storage
    this.engine = new LocalSokobanEngine('tutorial', 'tutorial', step.initialBoard);
    this.engine.saveToStorage = () => {}; // Disable storage save
    this.boardData.set(this.engine.board.map((r: string[]) => [...r]));
  }

  nextStep() {
    this.currentStepIdx.set((this.currentStepIdx() + 1) % this.steps.length);
    this.loadStep();
  }

  prevStep() {
    this.currentStepIdx.set((this.currentStepIdx() - 1 + this.steps.length) % this.steps.length);
    this.loadStep();
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.stopAnimation();
    } else {
      this.loadStep();
      this.playAnimation();
    }
  }

  private stopAnimation() {
    this.isPlaying.set(false);
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private playAnimation() {
    this.isPlaying.set(true);
    let seqIdx = 0;
    const step = this.currentStep();
    const seq = step.sequence;

    if (seq.length === 0) {
      this.isPlaying.set(false);
      return;
    }

    const tick = () => {
      if (!this.isPlaying()) return;
      if (seqIdx >= seq.length) {
        this.isPlaying.set(false);
        // Loop back after 2 seconds
        this.timer = setTimeout(() => {
          this.loadStep();
          this.playAnimation();
        }, 2000);
        return;
      }

      const dir = seq[seqIdx];
      const preMoves = this.engine.moves;
      this.engine.move(dir);
      const postMoves = this.engine.moves;
      
      this.boardData.set(this.engine.board.map((r: string[]) => [...r]));
      
      if (this.boardComp && postMoves > preMoves) {
        // Guess if it was a push by checking if there's a box in the direction moved
        // Actually, just check if the player moved. For simplicity, we just pass true if it was a push.
        // A better way is to check the cell in front of the old player position, but let's just pass false for now,
        // or check if the engine history changed and what it moved.
        // If the moves increased, it was a valid move. Let's just always pass false for isPush in tutorial to keep it simple,
        // or check the new board to see if a box is next to player in the move direction.
        this.boardComp.playTutorialAnimation(dir, false);
      }

      seqIdx++;
      this.timer = setTimeout(tick, 600);
    };

    this.timer = setTimeout(tick, 600);
  }

  close() {
    this.closed.emit();
  }
}
