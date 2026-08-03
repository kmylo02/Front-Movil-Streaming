import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonBadge,
  IonGrid, IonRow, IonCol, IonItem, IonLabel, IonModal, IonList,
  IonProgressBar, IonSpinner, IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  statsChartOutline, trendingUpOutline, alertCircleOutline, checkmarkCircleOutline,
  calendarOutline, chevronForwardOutline, closeOutline, peopleOutline,
} from 'ionicons/icons';
import { ReportsApiService, Dashboard, FinancieroMes, MovimientosMes } from '../core/services/api.service';
import { VentaEventsService } from '../core/services/venta-events.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterModule, CurrencyPipe, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonBadge,
    IonGrid, IonRow, IonCol, IonItem, IonLabel, IonModal, IonList,
    IonProgressBar, IonSpinner, IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
        <ion-buttons slot="end">
          <div class="user-chip">{{ inicialUsuario() }}</div>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="loading-center"><ion-spinner name="crescent"></ion-spinner></div>
      } @else if (data()) {
        <!-- KPI Cards -->
        <ion-grid class="kpi-grid">
          <ion-row>
            <ion-col size="6">
              <div class="kpi-card kpi-e" (click)="openMovimientos()">
                <div class="kpi-val">{{ data()!.totalActivas }}</div>
                <div class="kpi-lbl">Activas</div>
              </div>
            </ion-col>
            <ion-col size="6">
              <div class="kpi-card" [class.kpi-r]="data()!.proximasAVencer > 0" [class.kpi-dim]="data()!.proximasAVencer === 0">
                <div class="kpi-val">{{ data()!.proximasAVencer }}</div>
                <div class="kpi-lbl">Por vencer</div>
              </div>
            </ion-col>
            <ion-col size="6">
              <div class="kpi-card kpi-v" (click)="openMovimientos()">
                <div class="kpi-val" style="font-size:18px">{{ formatCurrency(data()!.ingresosMes) }}</div>
                <div class="kpi-lbl">Ingresos mes</div>
              </div>
            </ion-col>
            <ion-col size="6">
              <div class="kpi-card kpi-f">
                <div class="kpi-val" style="font-size:18px">{{ formatCurrency(gastosMes()) }}</div>
                <div class="kpi-lbl">Gastos mes</div>
              </div>
            </ion-col>
          </ion-row>
        </ion-grid>

        <!-- Resumen financiero -->
        @if (financiero().length > 0) {
          <ion-card class="chart-card">
            <ion-card-content>
              <div class="fin-header">
                <div class="chart-title">Resumen financiero {{ anioActual }}</div>
                <div class="fin-legend">
                  <span class="fl-item"><span class="fl-dot" style="background:#10b981"></span>Ingresos</span>
                  <span class="fl-item"><span class="fl-dot" style="background:#f43f5e"></span>Gastos</span>
                </div>
              </div>
              <div class="fin-totales-row">
                <div class="fin-total">
                  <span class="ft-val" style="color:#10b981">{{ formatCurrency(totalFinanciero('ingresos')) }}</span>
                  <span class="ft-lbl">Ingresos</span>
                </div>
                <div class="fin-total">
                  <span class="ft-val" style="color:#f43f5e">{{ formatCurrency(totalFinanciero('gastos')) }}</span>
                  <span class="ft-lbl">Gastos</span>
                </div>
                <div class="fin-total">
                  <span class="ft-val" [style.color]="totalFinanciero('ganancia') >= 0 ? '#a78bfa' : '#f43f5e'">
                    {{ formatCurrency(totalFinanciero('ganancia')) }}
                  </span>
                  <span class="ft-lbl">Ganancia</span>
                </div>
              </div>
              <div class="stacked-chart">
                @for (f of financiero(); track f.mes) {
                  <div class="s-col">
                    <div class="s-bars">
                      <div class="s-bar s-ing" [style.height.px]="finBarH(f.ingresos)" [title]="'Ingresos: ' + formatCurrency(f.ingresos)"></div>
                      <div class="s-bar s-gas" [style.height.px]="finBarH(f.gastos)" [title]="'Gastos: ' + formatCurrency(f.gastos)"></div>
                    </div>
                    <div class="s-lbl">{{ f.mes.slice(0,3) }}</div>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- Platforms -->
        @if (data()!.ventasPorServicio.length > 0) {
          <ion-card class="section-card">
            <ion-card-content>
              <div class="section-title">Activas por plataforma</div>
              @for (item of data()!.ventasPorServicio; track item._id) {
                <div class="plt-row">
                  <div class="plt-name">{{ item._id }}</div>
                  <div class="plt-bar-wrap">
                    <div class="plt-bar" [style.width.%]="(item.cantidad / (data()!.totalActivas || 1)) * 100"></div>
                  </div>
                  <div class="plt-count">{{ item.cantidad }}</div>
                </div>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- Alerts -->
        @if (data()!.alertas.length > 0) {
          <ion-card class="section-card">
            <ion-card-content>
              <div class="section-title">Próximas a vencer</div>
              @for (alerta of data()!.alertas; track alerta.id) {
                <div class="alerta-row">
                  <div class="alerta-info">
                    <div class="alerta-cliente">{{ alerta.cliente }}</div>
                    <div class="alerta-svc">{{ alerta.servicios }}</div>
                  </div>
                  <div class="alerta-badge" [class.badge-r]="diasRestantes(alerta.vence) <= 2">
                    {{ diasRestantes(alerta.vence) }}d
                  </div>
                </div>
              }
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>

    <!-- Movimientos Modal -->
    <ion-modal [isOpen]="showMovimientos()" (didDismiss)="showMovimientos.set(false)">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-title>Movimientos del mes</ion-title>
            <ion-buttons slot="end">
              <ion-button (click)="showMovimientos.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          @if (movimientos()) {
            <div class="mov-total">
              <div class="mov-total-val">{{ formatCurrency(movimientos()!.totalMes) }}</div>
              <div class="mov-total-lbl">Total del mes</div>
            </div>
            <div class="mov-extra-stats">
              <div class="mov-mini-stat">
                <div class="mov-mini-val">{{ totalVentasMes() }}</div>
                <div class="mov-mini-lbl">Ventas realizadas</div>
              </div>
              <div class="mov-mini-stat">
                <div class="mov-mini-val">{{ movimientos()!.clientes.length }}</div>
                <div class="mov-mini-lbl">Clientes activos</div>
              </div>
            </div>
            <ion-list>
              @for (c of movimientos()!.clientes; track c.clienteId) {
                <ion-item>
                  <ion-label>
                    <h3>{{ c.nombreCliente }}</h3>
                    <p>{{ c.servicios.join(', ') }}</p>
                    <p class="mov-cli-pct">{{ c.cantidadVentas }} venta(s) · {{ c.pct }}% del total</p>
                  </ion-label>
                  <div slot="end" class="mov-monto">{{ formatCurrency(c.totalMonto) }}</div>
                </ion-item>
              }
            </ion-list>
          }
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .loading-center { display:flex; justify-content:center; padding:80px 0; }
    .kpi-grid { padding: 12px 8px 4px; }
    .kpi-card {
      border-radius: 14px; padding: 14px 12px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
    }
    .kpi-val { font-size: 26px; font-weight: 900; letter-spacing: -0.03em; line-height: 1; margin-bottom: 4px; }
    .kpi-lbl { font-size: 11px; color: rgba(241,245,249,0.4); }
    .kpi-v .kpi-val { color: #a78bfa; }
    .kpi-e .kpi-val { color: #10b981; }
    .kpi-r .kpi-val { color: #f43f5e; }
    .kpi-f .kpi-val { color: #e879f9; }
    .kpi-dim .kpi-val { color: rgba(241,245,249,0.4); }
    .user-chip {
      width: 32px; height: 32px; border-radius: 9px;
      background: linear-gradient(135deg, #7c3aed, #c026d3);
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; font-weight: 800; color: #fff; margin-right: 8px;
    }
    .chart-card, .section-card { margin: 8px 16px; }
    .chart-title, .section-title { font-size: 13px; font-weight: 700; color: rgba(241,245,249,0.6); margin-bottom: 12px; }
    .bar-chart { display: flex; align-items: flex-end; gap: 4px; height: 60px; }
    .bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; justify-content: flex-end; }
    .bar { width: 100%; background: rgba(124,58,237,0.5); border-radius: 3px 3px 0 0; min-height: 4px; }
    .bar.bar-current { background: linear-gradient(180deg, #c026d3, #7c3aed); }
    .bar-lbl { font-size: 9px; color: rgba(241,245,249,0.35); }
    .plt-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .plt-name { font-size: 12px; font-weight: 600; color: rgba(241,245,249,0.7); width: 80px; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .plt-bar-wrap { flex: 1; height: 6px; background: rgba(255,255,255,0.07); border-radius: 3px; overflow: hidden; }
    .plt-bar { height: 100%; background: linear-gradient(90deg, #7c3aed, #c026d3); border-radius: 3px; min-width: 4px; }
    .plt-count { font-size: 12px; font-weight: 700; color: #a78bfa; width: 24px; text-align: right; flex-shrink: 0; }
    .alerta-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .alerta-row:last-child { border-bottom: none; }
    .alerta-cliente { font-size: 13px; font-weight: 600; color: #f1f5f9; margin-bottom: 2px; }
    .alerta-svc { font-size: 11px; color: rgba(241,245,249,0.4); }
    .alerta-badge { font-size: 11px; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.25); white-space: nowrap; }
    .badge-r { background: rgba(244,63,94,0.15); color: #f43f5e; border-color: rgba(244,63,94,0.25); }
    .mov-total { text-align: center; padding: 24px 16px 16px; }
    .mov-total-val { font-size: 32px; font-weight: 900; letter-spacing: -0.03em; color: #10b981; }
    .mov-total-lbl { font-size: 13px; color: rgba(241,245,249,0.4); margin-top: 4px; }
    .mov-monto { font-size: 13px; font-weight: 700; color: #10b981; }
    .fin-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .fin-legend { display: flex; gap: 10px; }
    .fl-item { display: flex; align-items: center; gap: 4px; font-size: 10px; color: rgba(241,245,249,0.5); }
    .fl-dot { width: 7px; height: 7px; border-radius: 2px; display: inline-block; }
    .fin-totales-row { display: flex; gap: 0; margin-bottom: 14px; }
    .fin-total { flex: 1; text-align: center; border-right: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; }
    .fin-total:last-child { border-right: none; }
    .ft-val { font-size: 14px; font-weight: 900; letter-spacing: -0.02em; }
    .ft-lbl { font-size: 9px; color: rgba(241,245,249,0.35); margin-top: 2px; }
    .stacked-chart { display: flex; align-items: flex-end; gap: 2px; height: 70px; }
    .s-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; height: 100%; justify-content: flex-end; }
    .s-bars { display: flex; gap: 1px; align-items: flex-end; width: 100%; }
    .s-bar { flex: 1; border-radius: 2px 2px 0 0; min-height: 2px; }
    .s-ing { background: #10b981; }
    .s-gas { background: #f43f5e; }
    .s-lbl { font-size: 8px; color: rgba(241,245,249,0.3); margin-top: 2px; }
    .mov-extra-stats { display: flex; gap: 0; padding: 0 16px 16px; }
    .mov-mini-stat { flex: 1; text-align: center; }
    .mov-mini-val { font-size: 18px; font-weight: 800; color: #f1f5f9; }
    .mov-mini-lbl { font-size: 10px; color: rgba(241,245,249,0.4); margin-top: 2px; }
    .mov-cli-pct { font-size: 10px; color: rgba(241,245,249,0.35); margin-top: 2px; }
  `],
})
export class DashboardPage implements OnInit, OnDestroy {
  loading = signal(true);
  data = signal<Dashboard | null>(null);
  financiero = signal<FinancieroMes[]>([]);
  movimientos = signal<MovimientosMes | null>(null);
  showMovimientos = signal(false);
  private sub!: Subscription;

  anioActual = new Date().getFullYear();

  gastosMes = computed(() => {
    const hoy = new Date();
    const m = hoy.getMonth();
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return this.financiero().find(f => f.mes === meses[m])?.gastos ?? 0;
  });

  constructor(
    private reportsApi: ReportsApiService,
    private ventaEvents: VentaEventsService,
    public auth: AuthService,
  ) {}

  ngOnInit() {
    this.load();
    this.sub = this.ventaEvents.ventaCambiada$.subscribe(() => this.load());
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  async doRefresh(ev: any) {
    await this.load();
    ev.target.complete();
  }

  async load() {
    this.loading.set(true);
    try {
      const [dash, fin] = await Promise.all([
        new Promise<Dashboard>((res) => this.reportsApi.getDashboard().subscribe(res)),
        new Promise<FinancieroMes[]>((res) => this.reportsApi.getFinanciero().subscribe(res)),
      ]);
      this.data.set(dash);
      this.financiero.set(fin);
    } finally {
      this.loading.set(false);
    }
  }

  async openMovimientos() {
    this.reportsApi.getMovimientosMes().subscribe(m => this.movimientos.set(m));
    this.showMovimientos.set(true);
  }

  inicialUsuario(): string {
    return this.auth.usuario()?.nombre?.charAt(0).toUpperCase() || 'A';
  }

  formatCurrency(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${val}`;
  }

  diasRestantes(vence: string): number {
    return Math.ceil((new Date(vence).getTime() - Date.now()) / 86400000);
  }

  totalFinanciero(campo: 'ingresos' | 'gastos' | 'ganancia'): number {
    return this.financiero().reduce((s, f) => s + f[campo], 0);
  }

  totalVentasMes(): number {
    return (this.movimientos()?.clientes ?? []).reduce((s, c) => s + c.cantidadVentas, 0);
  }

  finBarH(val: number): number {
    const max = Math.max(...this.financiero().flatMap(f => [f.ingresos, f.gastos]), 1);
    return Math.max(2, Math.round((val / max) * 56));
  }
}
