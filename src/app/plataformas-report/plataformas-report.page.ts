import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonChip, IonBadge,
  IonList, IonItem, IonLabel, IonSpinner, NavController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, trendingUpOutline } from 'ionicons/icons';
import { ReportsApiService, PlataformaStats, PlataformasReport } from '../core/services/api.service';

@Component({
  selector: 'app-plataformas-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonChip, IonBadge,
    IonList, IonItem, IonLabel, IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="navCtrl.back()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Por Plataforma</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <!-- Platform Chips -->
        <div class="plat-chips">
          @for (p of stats(); track p.nombre) {
            <button class="plat-chip" [class.chip-active]="plataformaActiva() === p.nombre"
              [style.--pc]="p.color" (click)="seleccionar(p)">
              <span class="pc-icon">{{ p.icono }}</span>
              <span class="pc-name">{{ p.nombre }}</span>
              <span class="pc-count">{{ p.totalActivas }}</span>
            </button>
          }
        </div>

        @if (reporte()) {
          <ion-card class="rep-card">
            <ion-card-content>
              <!-- Stats row -->
              <div class="rep-stats">
                <div class="rep-stat">
                  <div class="rep-val" style="color:#10b981">{{ reporte()!.totalActivas }}</div>
                  <div class="rep-lbl">Activas</div>
                </div>
                <div class="rep-stat">
                  <div class="rep-val" style="color:#a78bfa">{{ fmt(reporte()!.ingresosMes) }}</div>
                  <div class="rep-lbl">Ingresos mes</div>
                </div>
                <div class="rep-stat">
                  <div class="rep-val" style="color:#f43f5e">{{ reporte()!.proximasAVencer }}</div>
                  <div class="rep-lbl">Por vencer</div>
                </div>
              </div>

              <!-- Clientes table -->
              <div class="rep-table-title">Clientes activos</div>
              @for (c of reporte()!.clientes; track c.clienteId) {
                <div class="rep-row" [class.rep-warn]="c.diasRestantes !== null && c.diasRestantes <= 7">
                  <div class="rep-cli">
                    <div class="rep-nombre">{{ c.nombreCliente }}</div>
                    @if (c.diasRestantes !== null) {
                      <div class="rep-vence" [class.vence-r]="c.diasRestantes <= 3">
                        Vence en {{ c.diasRestantes }}d
                      </div>
                    }
                  </div>
                  <div class="rep-monto">{{ '$' + c.monto.toLocaleString('es-CO') }}</div>
                </div>
              }
            </ion-card-content>
          </ion-card>

          <!-- Combos -->
          @if (reporte()!.combos.length > 0) {
            <ion-card class="rep-card">
              <ion-card-content>
                <div class="rep-table-title">Combos frecuentes</div>
                @for (combo of reporte()!.combos; track combo.nombres) {
                  <div class="combo-row">
                    <div class="combo-chips">
                      @for (n of combo.nombres; track n) {
                        <ion-chip class="combo-chip">{{ n }}</ion-chip>
                      }
                    </div>
                    <div class="combo-cnt">{{ combo.cantidad }} clientes</div>
                  </div>
                }
              </ion-card-content>
            </ion-card>
          }

          <!-- Upsell -->
          @if (reporte()!.posiblesUpsells.length > 0) {
            <ion-card class="rep-card">
              <ion-card-content>
                <div class="rep-table-title">
                  <ion-icon name="trending-up-outline" style="vertical-align:middle;margin-right:4px;color:#10b981"></ion-icon>
                  Oportunidades de upsell
                </div>
                @for (u of reporte()!.posiblesUpsells; track u.clienteId) {
                  <div class="upsell-row">
                    <div class="upsell-nombre">{{ u.nombreCliente }}</div>
                    <div class="upsell-svcs">
                      @for (s of u.serviciosSugeridos; track s) {
                        <ion-badge color="secondary" class="upsell-badge">+ {{ s }}</ion-badge>
                      }
                    </div>
                  </div>
                }
              </ion-card-content>
            </ion-card>
          }
        } @else {
          <div class="sel-msg">Selecciona una plataforma para ver el reporte</div>
        }
      }
    </ion-content>
  `,
  styles: [`
    .loading-c { display:flex; justify-content:center; padding:60px 0; }
    .plat-chips { display:flex; overflow-x:auto; gap:8px; padding:12px 16px; scrollbar-width:none; }
    .plat-chip {
      display:flex; flex-direction:column; align-items:center; flex-shrink:0;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
      border-radius:14px; padding:10px 14px; gap:4px; min-width:80px;
    }
    .chip-active { background:rgba(var(--pc-rgb,124,58,237),0.12); border-color:var(--pc,rgba(124,58,237,0.4)); }
    .pc-icon { font-size:20px; }
    .pc-name { font-size:11px; font-weight:700; color:rgba(241,245,249,0.7); }
    .pc-count { font-size:14px; font-weight:900; color:var(--pc, #a78bfa); }
    .rep-card { margin:6px 16px; }
    .rep-stats { display:flex; gap:0; margin-bottom:16px; }
    .rep-stat { flex:1; text-align:center; border-right:1px solid rgba(255,255,255,0.06); }
    .rep-stat:last-child { border-right:none; }
    .rep-val { font-size:20px; font-weight:900; letter-spacing:-0.02em; }
    .rep-lbl { font-size:10px; color:rgba(241,245,249,0.35); margin-top:2px; }
    .rep-table-title { font-size:12px; font-weight:700; color:rgba(241,245,249,0.5); margin-bottom:10px; }
    .rep-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
    .rep-row:last-child { border-bottom:none; }
    .rep-warn { background:rgba(245,158,11,0.04); border-radius:6px; padding:8px 6px; }
    .rep-nombre { font-size:13px; font-weight:600; color:#f1f5f9; }
    .rep-vence { font-size:11px; color:#f59e0b; margin-top:2px; }
    .vence-r { color:#f43f5e; }
    .rep-monto { font-size:13px; font-weight:700; color:#10b981; }
    .combo-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); }
    .combo-chips { display:flex; flex-wrap:wrap; gap:4px; }
    .combo-chip { --background:rgba(124,58,237,0.1); --color:#a78bfa; font-size:11px; height:22px; }
    .combo-cnt { font-size:12px; color:rgba(241,245,249,0.4); flex-shrink:0; margin-left:8px; }
    .upsell-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); gap:8px; }
    .upsell-nombre { font-size:13px; font-weight:600; color:#f1f5f9; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .upsell-svcs { display:flex; gap:4px; flex-wrap:wrap; }
    .upsell-badge { font-size:10px; }
    .sel-msg { text-align:center; color:rgba(241,245,249,0.3); padding:60px 16px; font-size:14px; }
  `],
})
export class PlataformasReportPage implements OnInit {
  loading = signal(true);
  stats = signal<PlataformaStats[]>([]);
  reporte = signal<PlataformasReport | null>(null);
  plataformaActiva = signal('');
  loadingRep = signal(false);

  constructor(private reportsApi: ReportsApiService, public navCtrl: NavController) {
    addIcons({ chevronBackOutline, trendingUpOutline });
  }

  ngOnInit() {
    this.reportsApi.getPlataformasStats().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); if (s.length) this.seleccionar(s[0]); },
      error: () => this.loading.set(false),
    });
  }

  async doRefresh(ev: any) {
    this.loading.set(true);
    this.reportsApi.getPlataformasStats().subscribe({
      next: s => { this.stats.set(s); this.loading.set(false); if (s.length) this.seleccionar(s[0]); },
      error: () => { this.loading.set(false); ev.target.complete(); },
    });
    ev.target.complete();
  }

  seleccionar(p: PlataformaStats) {
    this.plataformaActiva.set(p.nombre);
    this.reportsApi.getPlataformaReport(p.nombre).subscribe(r => this.reporte.set(r));
  }

  fmt(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${val}`;
  }
}
