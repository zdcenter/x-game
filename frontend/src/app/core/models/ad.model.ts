/**
 * 广告网络配置模型 (例如 Google AdSense, AdMob 等)
 * 用于定义具体广告商的相关参数
 */
export interface AdNetwork {
  /** 唯一标识符 */
  id: number;
  /** 广告位 ID (与 AdPlacement 关联) */
  placement_id: string;
  /** 广告供应商名称 (如 'adsense') */
  provider: string;
  /** 供应商分配的特定广告槽 ID */
  slot_id: string;
  /** 渲染优先级 (数字越小优先级越高) */
  priority: number;
  /** 每个用户每日展示上限 */
  limit_per_user: number;
  /** 是否启用该网络 */
  is_enabled: boolean;
}

/**
 * 广告位配置模型
 * 用于定义页面上的特定广告区域 (如：大厅顶部、结算页面底部等)
 */
export interface AdPlacement {
  /** 广告位标识符 (如 'lobby_top') */
  id: string;
  /** 广告位显示名称 */
  name: string;
  /** 广告位描述信息 */
  desc: string;
  /** 是否全局启用该广告位 */
  is_enabled: boolean;
  /** 该广告位的每日总展示次数上限 */
  daily_total_limit: number;
  /** 挂载到该广告位下的所有广告网络配置 */
  networks: AdNetwork[];
}
