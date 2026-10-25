/**
 * IdiomSolitaireEngine - Client-Side Pure Calculation Engine for True Idiom Solitaire
 * Follows Rule 5: 100% runs in browser memory, offline-ready, zero latency.
 */

export interface IdiomItem {
  w: string;     // 4-character idiom
  p: string;     // Full pinyin
  e: string;     // Explanation
  d: string;     // Derivation / origin
  diff: string;  // easy | medium | hard
  firstChar: string;
  lastChar: string;
  firstPinyin: string; // Tone-stripped first character pinyin, e.g. "long"
  lastPinyin: string;  // Tone-stripped last character pinyin, e.g. "wu"
}

export type ChainMode = 'exact' | 'pinyin';

export class IdiomSolitaireEngine {
  private static instance: IdiomSolitaireEngine;
  private isLoaded = false;
  private allIdioms: IdiomItem[] = [];
  private wordMap = new Map<string, IdiomItem>();
  private charMap = new Map<string, IdiomItem[]>();    // firstChar -> idioms
  private pinyinMap = new Map<string, IdiomItem[]>();  // firstPinyin (no tone) -> idioms

  private distractorPool = '的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处队南给色光门即保治北造百规热领七海口东导器压志世金增争济阶油思术极交受联什认六共权收证改清己美再采转更刷加粮格并示才几石类精采满号';

  public static getInstance(): IdiomSolitaireEngine {
    if (!IdiomSolitaireEngine.instance) {
      IdiomSolitaireEngine.instance = new IdiomSolitaireEngine();
    }
    return IdiomSolitaireEngine.instance;
  }

  public static stripTone(py: string): string {
    if (!py) return '';
    return py.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  public async loadDictionary(url = '/assets/idiom/idiom-dict.json'): Promise<void> {
    if (this.isLoaded) return;
    if (typeof window === 'undefined') return;
    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to load idiom dictionary: HTTP ${resp.status}`);
      }
      const rawData = await resp.json();
      this.init(rawData);
    } catch (err) {
      console.error('[IdiomSolitaireEngine] Error loading dictionary:', err);
      throw err;
    }
  }

  public init(rawData: Array<{ w: string; p: string; e: string; d: string; diff: string }>): void {
    this.allIdioms = [];
    this.wordMap.clear();
    this.charMap.clear();
    this.pinyinMap.clear();

    for (const item of rawData) {
      if (!item.w || item.w.length !== 4) continue;
      const chars = Array.from(item.w);
      const pys = (item.p || '').split(' ');
      const firstPy = pys[0] ? IdiomSolitaireEngine.stripTone(pys[0]) : '';
      const lastPy = pys[3] ? IdiomSolitaireEngine.stripTone(pys[3]) : '';

      const idiom: IdiomItem = {
        w: item.w,
        p: item.p || '',
        e: item.e || '',
        d: item.d || '',
        diff: item.diff || 'medium',
        firstChar: chars[0],
        lastChar: chars[3],
        firstPinyin: firstPy,
        lastPinyin: lastPy,
      };

      this.allIdioms.push(idiom);
      this.wordMap.set(idiom.w, idiom);

      // Char map index
      if (!this.charMap.has(idiom.firstChar)) {
        this.charMap.set(idiom.firstChar, []);
      }
      this.charMap.get(idiom.firstChar)!.push(idiom);

      // Pinyin map index
      if (firstPy) {
        if (!this.pinyinMap.has(firstPy)) {
          this.pinyinMap.set(firstPy, []);
        }
        this.pinyinMap.get(firstPy)!.push(idiom);
      }
    }

    this.isLoaded = true;
    console.log(`[IdiomSolitaireEngine] Loaded ${this.allIdioms.length} idioms into memory.`);
  }

  public get loaded(): boolean {
    return this.isLoaded;
  }

  public get totalCount(): number {
    return this.allIdioms.length;
  }

  /**
   * Find an idiom by exact 4-character word.
   */
  public findByWord(word: string): IdiomItem | undefined {
    return this.wordMap.get(word);
  }

  /**
   * Pick a starting idiom seed, guaranteeing it has valid successors.
   */
  public getRandomSeed(mode: ChainMode = 'exact', difficulty?: string): IdiomItem {
    if (this.allIdioms.length === 0) {
      throw new Error('Idiom dictionary not loaded');
    }

    const filtered = this.allIdioms.filter(item => {
      if (difficulty && item.diff !== difficulty) return false;
      const successors = this.findSuccessors(item.lastChar, item.lastPinyin, mode, new Set([item.w]));
      return successors.length >= 2;
    });

    const pool = filtered.length > 0 ? filtered : this.allIdioms;
    const index = Math.floor(Math.random() * pool.length);
    return pool[index];
  }

  /**
   * Find all idioms that can legally chain from the given tail character or pinyin.
   */
  public findSuccessors(
    tailChar: string,
    tailPinyin: string,
    mode: ChainMode = 'exact',
    excludeWords: Set<string> = new Set()
  ): IdiomItem[] {
    let list: IdiomItem[] = [];
    if (mode === 'exact') {
      list = this.charMap.get(tailChar) || [];
    } else {
      // Pinyin mode
      const normalizedPy = IdiomSolitaireEngine.stripTone(tailPinyin);
      list = this.pinyinMap.get(normalizedPy) || [];
    }

    return list.filter(item => !excludeWords.has(item.w));
  }

  /**
   * Validate if two idioms can legally chain together.
   */
  public canChain(
    prev: IdiomItem,
    next: IdiomItem,
    mode: ChainMode = 'exact'
  ): { valid: boolean; reason?: string } {
    if (mode === 'exact') {
      if (prev.lastChar !== next.firstChar) {
        return {
          valid: false,
          reason: `首尾字不一致：上一成语尾字是“${prev.lastChar}”，当前成语首字是“${next.firstChar}”`
        };
      }
    } else {
      const prevLastPy = prev.lastPinyin;
      const nextFirstPy = next.firstPinyin;
      if (prevLastPy !== nextFirstPy && prev.lastChar !== next.firstChar) {
        return {
          valid: false,
          reason: `首尾读音不一致：上一成语尾字读音是“${prev.p.split(' ')[3] || prevLastPy}”，当前成语首字读音是“${next.p.split(' ')[0] || nextFirstPy}”`
        };
      }
    }
    return { valid: true };
  }

  /**
   * Generate an interactive keypad for the user to spell out a valid successor.
   * Ensures the keypad includes the characters for at least one recommended idiom, plus distractors.
   */
  public generateKeypad(
    tailChar: string,
    tailPinyin: string,
    mode: ChainMode = 'exact',
    excludeWords: Set<string> = new Set(),
    keypadSize = 12
  ): { targetIdiom: IdiomItem | null; requiredFirstChar: string; keys: string[]; successorsCount: number } {
    const successors = this.findSuccessors(tailChar, tailPinyin, mode, excludeWords);
    if (successors.length === 0) {
      return {
        targetIdiom: null,
        requiredFirstChar: tailChar,
        keys: [],
        successorsCount: 0,
      };
    }

    // Pick a recommended target idiom
    const targetIdiom = successors[Math.floor(Math.random() * successors.length)];
    const targetChars = Array.from(targetIdiom.w);
    const requiredFirstChar = targetChars[0];

    // Chars needed: all 4 characters of target idiom
    const neededSet = new Set(targetChars);

    // Collect distractors from other idioms or general pool
    const distractors: string[] = [];
    // Try to get characters from other valid successors first for authentic feel
    for (const s of successors) {
      for (const c of Array.from(s.w)) {
        if (!neededSet.has(c) && !distractors.includes(c)) {
          distractors.push(c);
          if (distractors.length >= keypadSize) break;
        }
      }
      if (distractors.length >= keypadSize) break;
    }

    // If still need more distractors, pull from distractorPool
    const poolChars = Array.from(this.distractorPool);
    while (distractors.length < keypadSize - targetChars.length) {
      const randChar = poolChars[Math.floor(Math.random() * poolChars.length)];
      if (!neededSet.has(randChar) && !distractors.includes(randChar)) {
        distractors.push(randChar);
      }
    }

    // Combine and shuffle
    const allKeys = [...targetChars, ...distractors.slice(0, keypadSize - targetChars.length)];
    // Fisher-Yates shuffle
    for (let i = allKeys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allKeys[i], allKeys[j]] = [allKeys[j], allKeys[i]];
    }

    return {
      targetIdiom,
      requiredFirstChar,
      keys: allKeys,
      successorsCount: successors.length,
    };
  }

  /**
   * Provide a smart hint (returns a valid successor idiom).
   */
  public getHint(
    tailChar: string,
    tailPinyin: string,
    mode: ChainMode = 'exact',
    excludeWords: Set<string> = new Set()
  ): IdiomItem | null {
    const successors = this.findSuccessors(tailChar, tailPinyin, mode, excludeWords);
    if (successors.length === 0) return null;
    return successors[Math.floor(Math.random() * successors.length)];
  }
}
