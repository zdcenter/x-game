export interface AdNetwork {
  id: number;
  placement_id: string;
  provider: string;
  slot_id: string;
  priority: number;
  limit_per_user: number;
  is_enabled: boolean;
}

export interface AdPlacement {
  id: string;
  name: string;
  desc: string;
  is_enabled: boolean;
  daily_total_limit: number;
  networks: AdNetwork[];
}
