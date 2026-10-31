export interface TentsPuzzle {
  id: string;
  name: string;
  chapter: string;
  difficulty: 'easy' | 'medium' | 'hard';
  size: number;
  rowClues: number[];
  colClues: number[];
  trees: { r: number; c: number }[];
  solution: { r: number; c: number }[];
}

export const TENTS_LEVELS: TentsPuzzle[] = [
  {
    "id": "easy_1",
    "name": "第 1 关 · 初试露营",
    "chapter": "第一章 晨光森林",
    "difficulty": "easy",
    "size": 5,
    "rowClues": [
      1,
      0,
      1,
      1,
      0
    ],
    "colClues": [
      1,
      0,
      1,
      0,
      1
    ],
    "trees": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 2,
        "c": 3
      },
      {
        "r": 4,
        "c": 4
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 2,
        "c": 2
      },
      {
        "r": 3,
        "c": 4
      }
    ]
  },
  {
    "id": "easy_2",
    "name": "第 2 关 · 绿野探秘",
    "chapter": "第一章 晨光森林",
    "difficulty": "easy",
    "size": 5,
    "rowClues": [
      2,
      0,
      1,
      1,
      0
    ],
    "colClues": [
      1,
      1,
      0,
      1,
      1
    ],
    "trees": [
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 2,
        "c": 1
      },
      {
        "r": 1,
        "c": 0
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 3
      },
      {
        "r": 2,
        "c": 4
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 0,
        "c": 0
      }
    ]
  },
  {
    "id": "easy_3",
    "name": "第 3 关 · 绿野探秘",
    "chapter": "第一章 晨光森林",
    "difficulty": "easy",
    "size": 5,
    "rowClues": [
      2,
      1,
      0,
      1,
      0
    ],
    "colClues": [
      1,
      1,
      1,
      0,
      1
    ],
    "trees": [
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 2,
        "c": 1
      },
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 1,
        "c": 1
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 4
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 1,
        "c": 2
      }
    ]
  },
  {
    "id": "easy_4",
    "name": "第 4 关 · 绿野探秘",
    "chapter": "第一章 晨光森林",
    "difficulty": "easy",
    "size": 6,
    "rowClues": [
      2,
      1,
      0,
      0,
      0,
      2
    ],
    "colClues": [
      1,
      0,
      1,
      1,
      1,
      1
    ],
    "trees": [
      {
        "r": 1,
        "c": 0
      },
      {
        "r": 4,
        "c": 3
      },
      {
        "r": 4,
        "c": 5
      },
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 0,
        "c": 5
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 5,
        "c": 3
      },
      {
        "r": 5,
        "c": 5
      },
      {
        "r": 1,
        "c": 2
      },
      {
        "r": 0,
        "c": 4
      }
    ]
  },
  {
    "id": "easy_5",
    "name": "第 5 关 · 绿野探秘",
    "chapter": "第一章 晨光森林",
    "difficulty": "easy",
    "size": 6,
    "rowClues": [
      1,
      1,
      0,
      2,
      0,
      1
    ],
    "colClues": [
      0,
      1,
      0,
      1,
      2,
      1
    ],
    "trees": [
      {
        "r": 0,
        "c": 2
      },
      {
        "r": 0,
        "c": 4
      },
      {
        "r": 3,
        "c": 4
      },
      {
        "r": 5,
        "c": 3
      },
      {
        "r": 4,
        "c": 5
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 3,
        "c": 3
      },
      {
        "r": 5,
        "c": 4
      },
      {
        "r": 3,
        "c": 5
      }
    ]
  },
  {
    "id": "easy_6",
    "name": "第 6 关 · 晨光深处",
    "chapter": "第一章 晨光森林",
    "difficulty": "easy",
    "size": 6,
    "rowClues": [
      1,
      1,
      0,
      2,
      0,
      1
    ],
    "colClues": [
      0,
      1,
      1,
      1,
      0,
      2
    ],
    "trees": [
      {
        "r": 0,
        "c": 4
      },
      {
        "r": 1,
        "c": 2
      },
      {
        "r": 3,
        "c": 4
      },
      {
        "r": 4,
        "c": 5
      },
      {
        "r": 5,
        "c": 3
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 5
      },
      {
        "r": 1,
        "c": 1
      },
      {
        "r": 3,
        "c": 3
      },
      {
        "r": 3,
        "c": 5
      },
      {
        "r": 5,
        "c": 2
      }
    ]
  },
  {
    "id": "medium_1",
    "name": "第 1 关 · 碧野营地",
    "chapter": "第二章 碧野营地",
    "difficulty": "medium",
    "size": 7,
    "rowClues": [
      3,
      0,
      1,
      0,
      0,
      3,
      0
    ],
    "colClues": [
      2,
      1,
      1,
      1,
      1,
      0,
      1
    ],
    "trees": [
      {
        "r": 1,
        "c": 0
      },
      {
        "r": 4,
        "c": 6
      },
      {
        "r": 4,
        "c": 1
      },
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 6,
        "c": 3
      },
      {
        "r": 0,
        "c": 3
      },
      {
        "r": 3,
        "c": 0
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 5,
        "c": 6
      },
      {
        "r": 5,
        "c": 1
      },
      {
        "r": 0,
        "c": 4
      },
      {
        "r": 5,
        "c": 3
      },
      {
        "r": 0,
        "c": 2
      },
      {
        "r": 2,
        "c": 0
      }
    ]
  },
  {
    "id": "medium_2",
    "name": "第 2 关 · 碧野营地",
    "chapter": "第二章 碧野营地",
    "difficulty": "medium",
    "size": 7,
    "rowClues": [
      3,
      0,
      0,
      1,
      1,
      0,
      2
    ],
    "colClues": [
      2,
      0,
      2,
      1,
      0,
      2,
      0
    ],
    "trees": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 5,
        "c": 5
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 5,
        "c": 2
      },
      {
        "r": 4,
        "c": 3
      },
      {
        "r": 0,
        "c": 4
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 0,
        "c": 3
      },
      {
        "r": 6,
        "c": 5
      },
      {
        "r": 3,
        "c": 0
      },
      {
        "r": 6,
        "c": 2
      },
      {
        "r": 4,
        "c": 2
      },
      {
        "r": 0,
        "c": 5
      }
    ]
  },
  {
    "id": "medium_3",
    "name": "第 3 关 · 碧野营地",
    "chapter": "第二章 碧野营地",
    "difficulty": "medium",
    "size": 7,
    "rowClues": [
      2,
      0,
      0,
      2,
      1,
      1,
      1
    ],
    "colClues": [
      2,
      0,
      2,
      0,
      1,
      1,
      1
    ],
    "trees": [
      {
        "r": 1,
        "c": 0
      },
      {
        "r": 6,
        "c": 1
      },
      {
        "r": 4,
        "c": 2
      },
      {
        "r": 3,
        "c": 4
      },
      {
        "r": 1,
        "c": 5
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 3,
        "c": 5
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 6,
        "c": 0
      },
      {
        "r": 5,
        "c": 2
      },
      {
        "r": 4,
        "c": 4
      },
      {
        "r": 0,
        "c": 5
      },
      {
        "r": 3,
        "c": 2
      },
      {
        "r": 3,
        "c": 6
      }
    ]
  },
  {
    "id": "medium_4",
    "name": "第 4 关 · 碧野营地",
    "chapter": "第二章 碧野营地",
    "difficulty": "medium",
    "size": 8,
    "rowClues": [
      1,
      1,
      0,
      1,
      2,
      1,
      1,
      1
    ],
    "colClues": [
      0,
      2,
      1,
      1,
      1,
      0,
      2,
      1
    ],
    "trees": [
      {
        "r": 1,
        "c": 1
      },
      {
        "r": 3,
        "c": 4
      },
      {
        "r": 7,
        "c": 7
      },
      {
        "r": 4,
        "c": 0
      },
      {
        "r": 6,
        "c": 3
      },
      {
        "r": 0,
        "c": 3
      },
      {
        "r": 5,
        "c": 5
      },
      {
        "r": 2,
        "c": 7
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 4,
        "c": 4
      },
      {
        "r": 7,
        "c": 6
      },
      {
        "r": 4,
        "c": 1
      },
      {
        "r": 6,
        "c": 2
      },
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 5,
        "c": 6
      },
      {
        "r": 3,
        "c": 7
      }
    ]
  },
  {
    "id": "medium_5",
    "name": "第 5 关 · 碧野营地",
    "chapter": "第二章 碧野营地",
    "difficulty": "medium",
    "size": 8,
    "rowClues": [
      1,
      0,
      2,
      0,
      2,
      1,
      2,
      0
    ],
    "colClues": [
      0,
      3,
      0,
      2,
      0,
      1,
      0,
      2
    ],
    "trees": [
      {
        "r": 0,
        "c": 2
      },
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 4,
        "c": 3
      },
      {
        "r": 4,
        "c": 6
      },
      {
        "r": 2,
        "c": 6
      },
      {
        "r": 6,
        "c": 6
      },
      {
        "r": 6,
        "c": 2
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 2,
        "c": 3
      },
      {
        "r": 4,
        "c": 1
      },
      {
        "r": 5,
        "c": 3
      },
      {
        "r": 4,
        "c": 7
      },
      {
        "r": 2,
        "c": 7
      },
      {
        "r": 6,
        "c": 5
      },
      {
        "r": 6,
        "c": 1
      }
    ]
  },
  {
    "id": "medium_6",
    "name": "第 6 关 · 碧野营地",
    "chapter": "第二章 碧野营地",
    "difficulty": "medium",
    "size": 8,
    "rowClues": [
      1,
      0,
      0,
      1,
      1,
      1,
      1,
      3
    ],
    "colClues": [
      2,
      1,
      1,
      1,
      0,
      1,
      0,
      2
    ],
    "trees": [
      {
        "r": 1,
        "c": 1
      },
      {
        "r": 6,
        "c": 0
      },
      {
        "r": 4,
        "c": 0
      },
      {
        "r": 4,
        "c": 7
      },
      {
        "r": 4,
        "c": 1
      },
      {
        "r": 5,
        "c": 5
      },
      {
        "r": 7,
        "c": 4
      },
      {
        "r": 7,
        "c": 6
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 7,
        "c": 0
      },
      {
        "r": 5,
        "c": 0
      },
      {
        "r": 3,
        "c": 7
      },
      {
        "r": 4,
        "c": 2
      },
      {
        "r": 6,
        "c": 5
      },
      {
        "r": 7,
        "c": 3
      },
      {
        "r": 7,
        "c": 7
      }
    ]
  },
  {
    "id": "hard_1",
    "name": "第 1 关 · 暮霭山谷",
    "chapter": "第三章 暮霭山谷",
    "difficulty": "hard",
    "size": 8,
    "rowClues": [
      1,
      2,
      2,
      1,
      1,
      2,
      0,
      2
    ],
    "colClues": [
      2,
      1,
      1,
      2,
      0,
      2,
      1,
      2
    ],
    "trees": [
      {
        "r": 0,
        "c": 2
      },
      {
        "r": 6,
        "c": 2
      },
      {
        "r": 1,
        "c": 7
      },
      {
        "r": 7,
        "c": 7
      },
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 5,
        "c": 6
      },
      {
        "r": 4,
        "c": 6
      },
      {
        "r": 2,
        "c": 5
      },
      {
        "r": 2,
        "c": 3
      },
      {
        "r": 6,
        "c": 0
      },
      {
        "r": 3,
        "c": 0
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 7,
        "c": 2
      },
      {
        "r": 2,
        "c": 7
      },
      {
        "r": 7,
        "c": 6
      },
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 5,
        "c": 7
      },
      {
        "r": 4,
        "c": 5
      },
      {
        "r": 1,
        "c": 5
      },
      {
        "r": 3,
        "c": 3
      },
      {
        "r": 5,
        "c": 0
      },
      {
        "r": 2,
        "c": 0
      }
    ]
  },
  {
    "id": "hard_2",
    "name": "第 2 关 · 暮霭山谷",
    "chapter": "第三章 暮霭山谷",
    "difficulty": "hard",
    "size": 8,
    "rowClues": [
      2,
      1,
      1,
      2,
      2,
      0,
      2,
      1
    ],
    "colClues": [
      1,
      2,
      2,
      0,
      2,
      1,
      2,
      1
    ],
    "trees": [
      {
        "r": 1,
        "c": 6
      },
      {
        "r": 4,
        "c": 4
      },
      {
        "r": 3,
        "c": 7
      },
      {
        "r": 5,
        "c": 5
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 4,
        "c": 3
      },
      {
        "r": 1,
        "c": 5
      },
      {
        "r": 6,
        "c": 7
      },
      {
        "r": 5,
        "c": 2
      },
      {
        "r": 1,
        "c": 1
      },
      {
        "r": 3,
        "c": 0
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 6
      },
      {
        "r": 3,
        "c": 4
      },
      {
        "r": 3,
        "c": 6
      },
      {
        "r": 6,
        "c": 5
      },
      {
        "r": 2,
        "c": 1
      },
      {
        "r": 4,
        "c": 2
      },
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 7,
        "c": 7
      },
      {
        "r": 6,
        "c": 2
      },
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 4,
        "c": 0
      }
    ]
  },
  {
    "id": "hard_3",
    "name": "第 3 关 · 暮霭山谷",
    "chapter": "第三章 暮霭山谷",
    "difficulty": "hard",
    "size": 8,
    "rowClues": [
      1,
      0,
      2,
      1,
      0,
      4,
      0,
      3
    ],
    "colClues": [
      2,
      0,
      2,
      1,
      2,
      1,
      1,
      2
    ],
    "trees": [
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 5,
        "c": 1
      },
      {
        "r": 7,
        "c": 6
      },
      {
        "r": 2,
        "c": 5
      },
      {
        "r": 1,
        "c": 0
      },
      {
        "r": 4,
        "c": 7
      },
      {
        "r": 4,
        "c": 2
      },
      {
        "r": 3,
        "c": 7
      },
      {
        "r": 7,
        "c": 1
      },
      {
        "r": 6,
        "c": 7
      },
      {
        "r": 5,
        "c": 5
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 3
      },
      {
        "r": 5,
        "c": 0
      },
      {
        "r": 7,
        "c": 5
      },
      {
        "r": 2,
        "c": 4
      },
      {
        "r": 2,
        "c": 0
      },
      {
        "r": 5,
        "c": 7
      },
      {
        "r": 5,
        "c": 2
      },
      {
        "r": 3,
        "c": 6
      },
      {
        "r": 7,
        "c": 2
      },
      {
        "r": 7,
        "c": 7
      },
      {
        "r": 5,
        "c": 4
      }
    ]
  },
  {
    "id": "hard_4",
    "name": "第 4 关 · 暮霭山谷",
    "chapter": "第三章 暮霭山谷",
    "difficulty": "hard",
    "size": 10,
    "rowClues": [
      3,
      1,
      1,
      1,
      2,
      1,
      2,
      0,
      2,
      1
    ],
    "colClues": [
      1,
      1,
      1,
      1,
      3,
      0,
      2,
      2,
      2,
      1
    ],
    "trees": [
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 1,
        "c": 1
      },
      {
        "r": 5,
        "c": 4
      },
      {
        "r": 9,
        "c": 0
      },
      {
        "r": 1,
        "c": 8
      },
      {
        "r": 8,
        "c": 2
      },
      {
        "r": 8,
        "c": 6
      },
      {
        "r": 4,
        "c": 6
      },
      {
        "r": 6,
        "c": 5
      },
      {
        "r": 0,
        "c": 6
      },
      {
        "r": 3,
        "c": 8
      },
      {
        "r": 5,
        "c": 9
      },
      {
        "r": 2,
        "c": 6
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 0,
        "c": 4
      },
      {
        "r": 1,
        "c": 2
      },
      {
        "r": 4,
        "c": 4
      },
      {
        "r": 9,
        "c": 1
      },
      {
        "r": 2,
        "c": 8
      },
      {
        "r": 8,
        "c": 3
      },
      {
        "r": 8,
        "c": 7
      },
      {
        "r": 5,
        "c": 6
      },
      {
        "r": 6,
        "c": 4
      },
      {
        "r": 0,
        "c": 7
      },
      {
        "r": 4,
        "c": 8
      },
      {
        "r": 6,
        "c": 9
      },
      {
        "r": 3,
        "c": 6
      }
    ]
  },
  {
    "id": "hard_5",
    "name": "第 5 关 · 暮霭山谷",
    "chapter": "第三章 暮霭山谷",
    "difficulty": "hard",
    "size": 10,
    "rowClues": [
      3,
      1,
      1,
      2,
      1,
      1,
      2,
      1,
      1,
      1
    ],
    "colClues": [
      3,
      1,
      1,
      1,
      2,
      0,
      2,
      1,
      2,
      1
    ],
    "trees": [
      {
        "r": 0,
        "c": 7
      },
      {
        "r": 2,
        "c": 8
      },
      {
        "r": 0,
        "c": 1
      },
      {
        "r": 8,
        "c": 6
      },
      {
        "r": 6,
        "c": 1
      },
      {
        "r": 1,
        "c": 4
      },
      {
        "r": 3,
        "c": 1
      },
      {
        "r": 5,
        "c": 1
      },
      {
        "r": 3,
        "c": 4
      },
      {
        "r": 1,
        "c": 9
      },
      {
        "r": 8,
        "c": 4
      },
      {
        "r": 5,
        "c": 8
      },
      {
        "r": 2,
        "c": 1
      },
      {
        "r": 6,
        "c": 7
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 6
      },
      {
        "r": 3,
        "c": 8
      },
      {
        "r": 0,
        "c": 0
      },
      {
        "r": 8,
        "c": 7
      },
      {
        "r": 7,
        "c": 1
      },
      {
        "r": 1,
        "c": 3
      },
      {
        "r": 3,
        "c": 2
      },
      {
        "r": 5,
        "c": 0
      },
      {
        "r": 4,
        "c": 4
      },
      {
        "r": 0,
        "c": 9
      },
      {
        "r": 9,
        "c": 4
      },
      {
        "r": 6,
        "c": 8
      },
      {
        "r": 2,
        "c": 0
      },
      {
        "r": 6,
        "c": 6
      }
    ]
  },
  {
    "id": "hard_6",
    "name": "第 6 关 · 暮霭山谷",
    "chapter": "第三章 暮霭山谷",
    "difficulty": "hard",
    "size": 10,
    "rowClues": [
      2,
      1,
      1,
      3,
      1,
      2,
      2,
      1,
      1,
      0
    ],
    "colClues": [
      2,
      0,
      2,
      1,
      1,
      2,
      2,
      1,
      2,
      1
    ],
    "trees": [
      {
        "r": 0,
        "c": 3
      },
      {
        "r": 6,
        "c": 4
      },
      {
        "r": 2,
        "c": 7
      },
      {
        "r": 0,
        "c": 6
      },
      {
        "r": 2,
        "c": 3
      },
      {
        "r": 5,
        "c": 5
      },
      {
        "r": 6,
        "c": 7
      },
      {
        "r": 4,
        "c": 0
      },
      {
        "r": 5,
        "c": 4
      },
      {
        "r": 5,
        "c": 6
      },
      {
        "r": 0,
        "c": 8
      },
      {
        "r": 2,
        "c": 0
      },
      {
        "r": 8,
        "c": 5
      },
      {
        "r": 2,
        "c": 9
      }
    ],
    "solution": [
      {
        "r": 0,
        "c": 2
      },
      {
        "r": 7,
        "c": 4
      },
      {
        "r": 3,
        "c": 7
      },
      {
        "r": 0,
        "c": 5
      },
      {
        "r": 2,
        "c": 2
      },
      {
        "r": 4,
        "c": 5
      },
      {
        "r": 6,
        "c": 8
      },
      {
        "r": 5,
        "c": 0
      },
      {
        "r": 5,
        "c": 3
      },
      {
        "r": 6,
        "c": 6
      },
      {
        "r": 1,
        "c": 8
      },
      {
        "r": 3,
        "c": 0
      },
      {
        "r": 8,
        "c": 6
      },
      {
        "r": 3,
        "c": 9
      }
    ]
  }
];

// 简单线性同余伪随机数生成器 (保证相同种子跨端跨环境 100% 同构)
class SeededRandom {
  private seed: number;
  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }
  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}

/**
 * 程序化关卡生成器 (Procedural Generator)
 * 给定棋盘尺寸与随机种子，生成合法的帐篷与树谜题
 */
export function generateProceduralTents(size: number = 6, difficulty: 'easy' | 'medium' | 'hard' = 'easy', seed?: number): TentsPuzzle {
  const rng = new SeededRandom(seed ?? Math.floor(Math.random() * 1000000));
  
  // 目标帐篷数：简单约为 size-1，中等约 1.1*size，困难约 1.4*size
  let targetCount = size - 1;
  if (difficulty === 'medium') targetCount = Math.floor(size * 1.1);
  if (difficulty === 'hard') targetCount = Math.floor(size * 1.4);

  const grid: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  // 0: 空格, 1: 树, 2: 帐篷

  const tents: { r: number; c: number }[] = [];
  const trees: { r: number; c: number }[] = [];

  const isValidTentPos = (r: number, c: number): boolean => {
    if (grid[r][c] !== 0) return false;
    // 检查 8 邻域不能有其他帐篷
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if (grid[nr][nc] === 2) return false;
        }
      }
    }
    return true;
  };

  // 尝试生成最多 200 次
  let attempts = 0;
  while (tents.length < targetCount && attempts < 200) {
    attempts++;
    const tr = rng.nextInt(0, size - 1);
    const tc = rng.nextInt(0, size - 1);

    if (!isValidTentPos(tr, tc)) continue;

    // 寻找其正交相邻的空格放树 (上/下/左/右)
    const dirs = [
      [-1, 0], [1, 0], [0, -1], [0, 1]
    ].sort(() => rng.next() - 0.5);

    let placedTree = false;
    for (const [dr, dc] of dirs) {
      const treeR = tr + dr;
      const treeC = tc + dc;
      if (treeR >= 0 && treeR < size && treeC >= 0 && treeC < size) {
        if (grid[treeR][treeC] === 0) {
          // 放置帐篷与树
          grid[tr][tc] = 2; // Tent
          grid[treeR][treeC] = 1; // Tree
          tents.push({ r: tr, c: tc });
          trees.push({ r: treeR, c: treeC });
          placedTree = true;
          break;
        }
      }
    }
  }

  // 计算每行每列帐篷数
  const rowClues = Array(size).fill(0);
  const colClues = Array(size).fill(0);
  for (const t of tents) {
    rowClues[t.r]++;
    colClues[t.c]++;
  }

  return {
    id: `proc_${difficulty}_${size}x${size}_${seed || Date.now()}`,
    name: `${size}x${size} 森林营地`,
    chapter: '随机森林挑战',
    difficulty,
    size,
    rowClues,
    colClues,
    trees,
    solution: tents
  };
}
