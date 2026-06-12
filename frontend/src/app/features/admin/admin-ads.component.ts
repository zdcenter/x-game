import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../core/services/admin.service';
import { ToastService } from '../../core/services/toast.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { AdPlacement, AdNetwork } from '../../core/models/ad.model';

@Component({
  selector: 'app-admin-ads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold">{{ i18n.t('admin.ads.title')() }}</h2>
          <p class="text-[var(--color-text-muted)] mt-1">{{ i18n.t('admin.ads.subtitle')() }}</p>
        </div>
      </div>

      @if (isLoading()) {
        <div class="text-center py-12 opacity-50 animate-pulse">Loading Ad Config...</div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <!-- Placements List -->
          <div class="lg:col-span-1 space-y-4">
            <h3 class="font-bold text-lg">{{ i18n.t('admin.ads.placements')() }}</h3>
            @for (p of placements(); track p.id) {
              <div (click)="selectPlacement(p)" 
                   class="bg-[var(--color-bg-card)] rounded-xl p-4 border cursor-pointer transition-colors"
                   [ngClass]="selectedPlacement()?.id === p.id ? 'border-[var(--color-accent-from)] ring-1 ring-[var(--color-accent-from)]' : 'border-[var(--color-border-card)] hover:border-white/20'">
                <div class="flex justify-between items-center">
                  <span class="font-bold">{{ p.name }}</span>
                  <div class="w-2 h-2 rounded-full" [ngClass]="p.is_enabled ? 'bg-emerald-400' : 'bg-red-500'"></div>
                </div>
                <p class="text-xs opacity-70 mt-1 line-clamp-1">{{ p.desc }}</p>
              </div>
            }
          </div>

          <!-- Placement Detail -->
          <div class="lg:col-span-2">
            @if (selectedPlacement(); as p) {
              <div class="bg-[var(--color-bg-card)] rounded-2xl p-6 border border-[var(--color-border-card)]">
                <div class="flex justify-between items-start mb-6">
                  <div>
                    <h3 class="text-xl font-bold">{{ p.name }} <span class="text-xs font-mono opacity-50 ml-2">#{{ p.id }}</span></h3>
                    <p class="text-sm opacity-70 mt-1">{{ p.desc }}</p>
                  </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div class="flex justify-between items-center bg-[var(--color-bg-main)] p-4 rounded-xl border border-[var(--color-border-card)]">
                    <div>
                      <h4 class="font-bold text-sm">{{ i18n.t('admin.ads.enabled_label')() }}</h4>
                      <p class="text-xs opacity-70 mt-1">{{ i18n.t('admin.ads.enabled_desc')() }}</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" class="sr-only peer" [(ngModel)]="p.is_enabled" (ngModelChange)="savePlacement(p)">
                      <div class="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-accent-from)]"></div>
                    </label>
                  </div>
                  
                  <div class="bg-[var(--color-bg-main)] p-4 rounded-xl border border-[var(--color-border-card)]">
                    <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.ads.limit_label')() }}</label>
                    <input type="number" [(ngModel)]="p.daily_total_limit" (change)="savePlacement(p)" class="w-full bg-transparent border-b border-white/10 focus:border-[var(--color-accent-from)] outline-none px-2 py-1">
                  </div>
                </div>

                <!-- Networks -->
                <div class="flex justify-between items-end mb-4">
                  <h4 class="font-bold text-lg">{{ i18n.t('admin.ads.networks_title')() }}</h4>
                  <button (click)="openNetworkModal()" class="px-3 py-1.5 text-xs font-bold rounded bg-[var(--color-accent-from)]/20 text-[var(--color-accent-from)] border border-[var(--color-accent-from)]/30 hover:bg-[var(--color-accent-from)] hover:text-white transition-all">
                    {{ i18n.t('admin.ads.add_network')() }}
                  </button>
                </div>

                @if (!p.networks || p.networks.length === 0) {
                  <div class="text-center py-8 opacity-50 border border-dashed border-white/20 rounded-xl">
                    {{ i18n.t('admin.ads.no_network')() }}
                  </div>
                } @else {
                  <div class="space-y-3">
                    @for (net of p.networks; track net.id; let idx = $index) {
                      <div class="bg-[var(--color-bg-main)] rounded-xl p-4 border border-[var(--color-border-card)] flex flex-col md:flex-row md:items-center gap-4">
                        <div class="flex flex-col items-center justify-center shrink-0 w-12 h-12 bg-[var(--color-bg-card)] rounded-lg font-mono text-sm border border-white/10 shadow-inner">
                          <span class="text-xs opacity-50 block leading-none mb-1">PRI</span>
                          <span class="font-bold text-[var(--color-accent-from)]">{{ net.priority }}</span>
                        </div>
                        
                        <div class="flex-grow min-w-0">
                          <div class="flex items-center gap-2 mb-1">
                            <span class="font-bold text-sm uppercase tracking-wider">{{ net.provider }}</span>
                            @if(net.is_enabled) {
                              <span class="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">Active</span>
                            } @else {
                              <span class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-bold uppercase">Disabled</span>
                            }
                          </div>
                          <p class="text-xs font-mono opacity-60 truncate" title="{{net.slot_id}}">{{ net.slot_id }}</p>
                        </div>

                        <div class="shrink-0 flex items-center space-x-2">
                          <button (click)="openNetworkModal(net)" class="p-2 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Edit">
                            ✎
                          </button>
                          <button (click)="deleteNetwork(net.id)" class="p-2 rounded hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors" title="Delete">
                            ✕
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                }
              </div>
            } @else {
              <div class="flex items-center justify-center h-full min-h-[400px] border border-dashed border-[var(--color-border-card)] rounded-2xl opacity-50">
                Select a placement from the left to edit
              </div>
            }
          </div>
        </div>
      }

      <!-- Network Modal -->
      @if (showModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div class="bg-[var(--color-bg-card)] rounded-2xl w-full max-w-md border border-[var(--color-border-card)] shadow-2xl overflow-hidden animate-slide-up">
            <div class="px-6 py-4 border-b border-[var(--color-border-card)] flex justify-between items-center bg-[var(--color-bg-main)]/50">
              <h3 class="font-bold text-lg">{{ editingNetwork() ? i18n.t('admin.ads.modal_edit')() : i18n.t('admin.ads.modal_add')() }}</h3>
              <button (click)="closeNetworkModal()" class="text-white/50 hover:text-white">✕</button>
            </div>
            <div class="p-6 space-y-4">
              <div>
                <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.ads.modal_provider')() }}</label>
                <select [(ngModel)]="modalForm.provider" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]">
                  <option value="google_adsense">Google AdSense / AdMob</option>
                  <option value="adsterra_monetag">Adsterra / Monetag</option>
                  <option value="ezoic">Ezoic</option>
                  <option value="journey_mediavine">Journey by Mediavine</option>
                  <option value="mediavine">Mediavine</option>
                  <option value="raptive">Raptive</option>
                  <option value="unity_ads">Unity Ads</option>
                  <option value="wechat_minigame">WeChat MiniGame</option>
                  <option value="applovin">AppLovin</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.ads.modal_slot')() }}</label>
                <input type="text" [(ngModel)]="modalForm.slot_id" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]" placeholder="e.g. ca-pub-xxx/7984661759">
                <p class="text-[10px] text-[var(--color-accent-from)] opacity-80 mt-1">
                  * 提示: 对于 Google AdSense，请使用 <strong>发布商ID/广告位ID</strong> 的格式 (如: ca-pub-12345/67890)。如果仅填入纯数字，则默认使用项目的全局发布商ID。
                </p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.ads.modal_priority')() }}</label>
                  <input type="number" [(ngModel)]="modalForm.priority" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]">
                </div>
                <div>
                  <label class="block text-xs font-bold opacity-70 mb-2">{{ i18n.t('admin.ads.modal_limit')() }}</label>
                  <input type="number" [(ngModel)]="modalForm.limit_per_user" class="w-full bg-[var(--color-bg-main)] border border-[var(--color-border-card)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-accent-to)]">
                </div>
              </div>
              <div class="flex items-center space-x-3 pt-2">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" class="sr-only peer" [(ngModel)]="modalForm.is_enabled">
                  <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
                <span class="text-sm font-bold">{{ i18n.t('admin.ads.modal_enabled')() }}</span>
              </div>
            </div>
            <div class="px-6 py-4 border-t border-[var(--color-border-card)] bg-[var(--color-bg-main)]/50 flex justify-end space-x-3">
              <button (click)="closeNetworkModal()" class="px-4 py-2 text-sm font-bold rounded hover:bg-white/10 transition-colors">{{ i18n.t('admin.ads.modal_cancel')() }}</button>
              <button (click)="saveNetwork()" class="px-4 py-2 text-sm font-bold rounded bg-[var(--color-accent-from)] text-white hover:brightness-110 transition-all">{{ i18n.t('admin.ads.modal_save')() }}</button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminAdsComponent implements OnInit {
  private adminService = inject(AdminService);
  private toast = inject(ToastService);
  i18n = inject(I18nService);

  placements = signal<AdPlacement[]>([]);
  isLoading = signal(true);
  selectedPlacement = signal<AdPlacement | null>(null);

  showModal = signal(false);
  editingNetwork = signal<AdNetwork | null>(null);
  
  modalForm = {
    provider: 'google_adsense',
    slot_id: '',
    priority: 1,
    limit_per_user: -1,
    is_enabled: true
  };

  ngOnInit() {
    this.fetchData();
  }

  fetchData() {
    this.isLoading.set(true);
    this.adminService.getAdPlacements().subscribe({
      next: (res) => {
        this.placements.set(res);
        if (this.selectedPlacement()) {
           const updated = res.find(p => p.id === this.selectedPlacement()!.id);
           this.selectedPlacement.set(updated || null);
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.toast.show('Failed to load ad settings', 'error');
        this.isLoading.set(false);
      }
    });
  }

  selectPlacement(p: AdPlacement) {
    this.selectedPlacement.set(p);
  }

  savePlacement(p: AdPlacement) {
    this.adminService.updateAdPlacement(p.id, {
      is_enabled: p.is_enabled,
      daily_total_limit: p.daily_total_limit
    }).subscribe({
      next: () => this.toast.show('Placement saved', 'success'),
      error: () => this.toast.show('Failed to save placement', 'error')
    });
  }

  openNetworkModal(net?: AdNetwork) {
    if (net) {
      this.editingNetwork.set(net);
      this.modalForm = { ...net };
    } else {
      this.editingNetwork.set(null);
      this.modalForm = {
        provider: 'google_adsense',
        slot_id: '',
        priority: 1,
        limit_per_user: -1,
        is_enabled: true
      };
    }
    this.showModal.set(true);
  }

  closeNetworkModal() {
    this.showModal.set(false);
    this.editingNetwork.set(null);
  }

  saveNetwork() {
    const p = this.selectedPlacement();
    if (!p) return;

    const payload = {
      ...this.modalForm,
      placement_id: p.id
    };

    const req = this.editingNetwork() 
      ? this.adminService.updateAdNetwork(this.editingNetwork()!.id, payload)
      : this.adminService.addAdNetwork(payload);

    req.subscribe({
      next: () => {
        this.toast.show('Network saved', 'success');
        this.closeNetworkModal();
        this.fetchData();
      },
      error: () => this.toast.show('Failed to save network', 'error')
    });
  }

  deleteNetwork(id: number) {
    if (!confirm('Are you sure you want to delete this network?')) return;
    this.adminService.deleteAdNetwork(id).subscribe({
      next: () => {
        this.toast.show('Network deleted', 'success');
        this.fetchData();
      },
      error: () => this.toast.show('Failed to delete network', 'error')
    });
  }
}
