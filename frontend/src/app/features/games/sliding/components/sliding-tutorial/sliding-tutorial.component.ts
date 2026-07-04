import { Component, computed, signal, effect, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface TutorialStep {
  title: string;
  desc: string;
  size: number;
  initialCells: number[];
  sequence: number[]; // values to click
}

@Component({
  selector: 'app-sliding-tutorial',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sliding-tutorial.component.html'
})
export class SlidingTutorialComponent implements OnDestroy {
  @Input() inline = false;
  @Output() closed = new EventEmitter<void>();

  readonly steps: TutorialStep[] = [
    {
      title: '技巧一：首行归位法 (The First Row)',
      desc: '不要试图一次性看满全盘。正确的策略是：先拼好第一行（1,2,3,4），然后在接下来的游戏中再也不去动它。这里演示了如何将散乱的 1-4 组合归位。',
      size: 4,
      initialCells: [
        6,  2,  7,  0,
        1,  5,  4,  3,
        9, 10, 11,  8,
       13, 14, 15, 12
      ],
      sequence: [3, 4, 7, 2, 6, 1, 5, 6, 2, 3, 4]
    },
    {
      title: '技巧二：降维打击 (Layer-by-Layer)',
      desc: '拼好第一行后，就把 4x4 当成 3x4 来玩。接着我们用同样的方法拼好第二行（5,6,7,8），以后就不再动前两行了。',
      size: 4,
      initialCells: [
        1,  2,  3,  4,
       10,  6, 11,  0,
        5,  9,  8,  7,
       13, 14, 15, 12
      ],
      sequence: [7, 8, 11, 6, 10, 5, 9, 10, 6, 7, 8]
    },
    {
      title: '技巧三：最后两行的“贪吃蛇”转法',
      desc: '最后两行空间极小，很容易卡死。秘诀是：把方块排成一个环，利用空位像履带一样循环旋转，直到它们落入正确的位置！',
      size: 4,
      initialCells: [
        1,  2,  3,  4,
        5,  6,  7,  8,
       14, 10,  0, 12,
        9, 13, 11, 15
      ],
      sequence: [10, 14, 9, 13, 14, 10, 11, 15]
    }
  ];

  constructor() {
  }

  currentStepIdx = signal(0);
  currentStep = computed(() => this.steps[this.currentStepIdx()]);
  
  cells = signal<number[]>([]);
  emptyIdx = signal<number>(15);
  isPlaying = signal(false);
  private timer: any;

  ngOnInit() {
    this.loadStep();
  }

  ngOnDestroy() {
    this.stopAnimation();
  }

  loadStep() {
    this.stopAnimation();
    const step = this.currentStep();
    this.cells.set([...step.initialCells]);
    this.emptyIdx.set(step.initialCells.indexOf(0));
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

      const val = seq[seqIdx];
      const c = this.cells();
      const valIdx = c.indexOf(val);
      const eIdx = this.emptyIdx();

      // Swap
      c[eIdx] = val;
      c[valIdx] = 0;
      this.cells.set([...c]);
      this.emptyIdx.set(valIdx);

      seqIdx++;
      this.timer = setTimeout(tick, 600);
    };

    this.timer = setTimeout(tick, 600);
  }

  // Computed tiles for rendering
  tiles = computed(() => {
    const size = this.currentStep().size;
    const c = this.cells();
    const tileObjects = [];
    
    for (let val = 1; val < size * size; val++) {
      const idx = c.indexOf(val);
      if (idx !== -1) {
        const row = Math.floor(idx / size);
        const col = idx % size;
        tileObjects.push({ val, row, col, size });
      }
    }
    return tileObjects;
  });

  close() {
    this.closed.emit();
  }
}
