import { Lang } from '../../../../core/i18n/translations';

export const codebreakerTranslations: Record<Lang, Record<string, string>> = {
  en: {
    'codebreaker.enter_guess': 'Enter your guess...',
    'codebreaker.guess': 'Guess',
    'codebreaker.attempts': 'Attempts',
    'codebreaker.guess_history': 'Guess History',
    'codebreaker.opponent_history': 'Opponent Progress',
    'codebreaker.rules_btn': 'Rules',
    'codebreaker.keyboard.clear': 'CLR',
    'codebreaker.keyboard.submit': 'OK',
    'codebreaker.helper_board': 'Number Scratchpad',
    'codebreaker.helper_desc': 'Tap a number to cycle: Normal ➔ Rule Out (red cross) ➔ Confirmed (green check).',
    'codebreaker.invalid_length': 'Code must be {length} digits long!',
    'codebreaker.duplicate_digits': 'Digits must not repeat!',
    'codebreaker.victory_desc': 'Successfully cracked the code in {attempts} attempts!',
    'codebreaker.game_mode_pk': 'Real-Time PK Speed',
    'codebreaker.opponent_attempts': 'Opponent Attempts: {count}',
    'codebreaker.opponent_best': 'Opponent Best: {best}'
  },
  zh: {
    'codebreaker.enter_guess': '请输入猜测的数字...',
    'codebreaker.guess': '确认猜测',
    'codebreaker.attempts': '尝试次数',
    'codebreaker.guess_history': '我的猜测记录',
    'codebreaker.opponent_history': '对手猜测进度',
    'codebreaker.rules_btn': '规则说明',
    'codebreaker.keyboard.clear': '清除',
    'codebreaker.keyboard.submit': '确定',
    'codebreaker.helper_board': '数字辅助板 (草稿)',
    'codebreaker.helper_desc': '点击数字轮转状态：正常 ➔ 排除（红叉）➔ 确定（绿勾）。',
    'codebreaker.invalid_length': '密码长度必须为 {length} 位！',
    'codebreaker.duplicate_digits': '数字不能重复！',
    'codebreaker.victory_desc': '恭喜！共尝试了 {attempts} 次，成功破译密码！',
    'codebreaker.game_mode_pk': '实时对战竞速',
    'codebreaker.opponent_attempts': '对手尝试次数：{count} 次',
    'codebreaker.opponent_best': '对手最佳提示：{best}'
  }
};
