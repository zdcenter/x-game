/**
 * SEO Utility Functions for Meta Title and Meta Description Optimization.
 *
 * Ensures full compliance with search engine guidelines (Google, Bingbot, etc.):
 * - Meta Title: strictly <= 70 chars (accounting for HTML entities like &amp;)
 * - Meta Description: optimal 130 - 160 chars (never < 120 chars, never truncated unexpectedly)
 */

const META_DESC_EXTENSIONS: Record<string, string[]> = {
  zh: [
    '包含全面详细的规则说明、通关核心逻辑与进阶高分策略技巧。',
    '支持单人沉浸式逻辑思维训练与多人在线实时竞速PK对战，即开即玩无需下载。',
    '随时随地挑战思维极限，突破解谜瓶颈，与全球益智高手争夺排行榜最高荣誉！'
  ],
  en: [
    'Explore comprehensive game rules, step-by-step guides, and pro puzzle strategies.',
    'Enjoy solo logic brain training or compete in real-time online multiplayer PK battles.',
    'Play instantly free in your browser and climb the global leaderboard!'
  ],
  ja: [
    '基本ルールや図解ガイド、ハイスコアを獲得するための実戦的な攻略法を網羅。',
    'ソロでの本格的な論理的思考トレーニングから、リアルタイムのオンライン対戦まで対応。',
    'ブラウザで今すぐ無料プレイして、世界中のパズルマスターとランキングを競い合おう！'
  ],
  ko: [
    '기본 게임 규칙부터 단계별 가이드, 고득점을 위한 실전 퍼즐 공략법을 상세히 제공합니다.',
    '혼자서 즐기는 논리 두뇌 훈련부터 실시간 온라인 멀티플레이어 PK 대결까지 모두 지원합니다.',
    '다운로드 없이 웹 브라우저에서 바로 무료로 플레이하고 글로벌 랭킹 1위에 도전해보세요!'
  ],
  es: [
    'Descubre reglas detalladas, guías paso a paso y estrategias para dominar cada nivel.',
    'Disfruta del entrenamiento mental en solitario o compite en duelos multijugador online.',
    '¡Juega gratis en tu navegador sin descargas y compite por el ranking mundial!'
  ],
  pt: [
    'Confira regras completas, tutoriais passo a passo e estratégias para dominar o jogo.',
    'Aproveite o treino lógico solo ou dispute partidas no multiplayer online em tempo real.',
    'Jogue grátis direto no navegador sem download e dispute o topo do ranking global!'
  ],
  fr: [
    'Découvrez les règles détaillées, des guides étape par étape et des stratégies avancées.',
    'Profitez d’un entraînement cérébral en solo ou défiez des adversaires en multijoueur.',
    'Jouez gratuitement dans votre navigateur et visez le sommet du classement mondial !'
  ],
  de: [
    'Entdecke ausführliche Spielregeln, Schritt-für-Schritt-Anleitungen und Profi-Strategien.',
    'Erlebe entspanntes Gehirntraining im Solo-Modus oder packende Echtzeit-Multiplayer-Duelle.',
    'Kostenlos im Browser ohne Download spielen und die weltweite Rangliste erobern!'
  ]
};

/**
 * Optimizes a meta description to meet search engine sweet spot (130 - 160 characters).
 * If the original description is too short (< 130 chars), appends relevant localized contextual phrases.
 * If too long (> 160 chars), truncates cleanly at sentence or word boundaries.
 */
export function optimizeMetaDescription(raw: string | undefined | null, lang: string): string {
  let text = (raw || '').trim();
  text = text.replace(/[,\-;:，、；：]+$/, '');

  // If already in target range, return as is
  if (text.length >= 130 && text.length <= 160) {
    return text;
  }

  // If too long, truncate cleanly
  if (text.length > 160) {
    let cut = text.slice(0, 155);
    const sentenceEnd = Math.max(
      cut.lastIndexOf('. '),
      cut.lastIndexOf('。'),
      cut.lastIndexOf('! '),
      cut.lastIndexOf('！'),
      cut.lastIndexOf('? '),
      cut.lastIndexOf('？')
    );
    if (sentenceEnd >= 120) {
      return cut.slice(0, sentenceEnd + 1).trim();
    }
    cut = cut.replace(/[,\s;:\-\—、，；]+[^\s,;:\-\—、，；]*$/, '').trim();
    cut = cut.replace(/[,\-;:，、；：]+$/, '');
    return cut + '...';
  }

  // If under 130 characters, append localized extensions until reaching 130-160 range
  const sentences = META_DESC_EXTENSIONS[lang] || META_DESC_EXTENSIONS['en'];
  const separator = (lang === 'zh' || lang === 'ja') ? '' : ' ';
  const punct = (lang === 'zh' || lang === 'ja') ? '。' : '.';

  let res = text;
  for (const s of sentences) {
    if (res.length >= 130) break;
    let candidate = '';
    if (res.length > 0) {
      const needsPunct = !res.endsWith('.') && !res.endsWith('。') && !res.endsWith('!') && !res.endsWith('！') && !res.endsWith('?') && !res.endsWith('？');
      candidate = res + (needsPunct ? punct : '') + separator + s;
    } else {
      candidate = s;
    }

    if (candidate.length <= 160) {
      res = candidate;
    } else {
      let cut = candidate.slice(0, 155);
      const sentenceEnd = Math.max(
        cut.lastIndexOf('. '),
        cut.lastIndexOf('。'),
        cut.lastIndexOf('! '),
        cut.lastIndexOf('！')
      );
      if (sentenceEnd >= 130) {
        res = cut.slice(0, sentenceEnd + 1).trim();
        break;
      }
      cut = cut.replace(/[,\s;:\-\—、，；]+[^\s,;:\-\—、，；]*$/, '').trim();
      cut = cut.replace(/[,\-;:，、；：]+$/, '');
      res = cut + '...';
      break;
    }
  }

  return res;
}

/**
 * Calculates real HTML string length after entity encoding (e.g. & -> &amp;).
 */
export function getHtmlEntityLength(str: string): number {
  return str.replace(/&/g, '&amp;').length;
}

/**
 * Optimizes a page title to strictly stay <= 68 HTML characters.
 */
export function optimizeMetaTitle(baseTitle: string, appName: string, suffix?: string): string {
  let cleanBase = (baseTitle || '').trim();

  // 防止重复拼接品牌名称 (例如: Title - 益智游戏PK网 - 益智游戏PK网)
  if (appName) {
    const escapedApp = appName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanBase = cleanBase.replace(new RegExp(`(\\s*[-|–—]\\s*${escapedApp})+\\s*$`, 'i'), '').trim();
    // 英文通用品牌名也一并去重
    cleanBase = cleanBase.replace(/(\s*[-|–—]\s*Puzzle PK)+\s*$/i, '').trim();
  }

  const defaultSuffix = suffix ?? ` - ${appName}`;
  let title = `${cleanBase}${defaultSuffix}`;

  if (getHtmlEntityLength(title) <= 68) {
    return title;
  }

  // Try shorter suffix
  title = `${cleanBase} | ${appName}`;
  if (getHtmlEntityLength(title) <= 68) {
    return title;
  }

  // Try base title alone
  if (getHtmlEntityLength(cleanBase) <= 68) {
    return cleanBase;
  }

  // Truncate base title cleanly
  let t = cleanBase;
  while (getHtmlEntityLength(t + '...') > 68 && t.length > 0) {
    t = t.slice(0, -1);
  }
  return t.replace(/\s+\S*$/, '') + '...';
}
