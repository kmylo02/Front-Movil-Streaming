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

        <!-- Ingresos chart -->
        @if (data()!.ingresosMensuales.length > 0) {
          <ion-card class="chart-card">
            <ion-card-content>
              <div class="chart-title">Ingresos — últimos 6 meses</div>
              <div class="bar-chart">
                @for (item of chartBars(); track item.label) {
                  <div class="bar-col">
                    <div class="bar" [style.height.%]="item.pct" [class.bar-current]="item.current"></div>
                    <div class="bar-lbl">{{ item.label }}</div>
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
            <ion-list>
              @for (c of movimientos()!.clientes; track c.clienteId) {
                <ion-item>
                  <ion-label>
                    <h3>{{ c.nombreCliente }}</h3>
                    <p>{{ c.servicios.join(', ') }}</p>
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
  `],
})
export class DashboardPage implements OnInit, OnDestroy {
  loading = signal(true);
  data = signal<Dashboard | null>(null);
  financiero = signal<FinancieroMes[]>([]);
  movimientos = signal<MovimientosMes | null>(null);
  showMovimientos = signal(false);
  private sub!: Subscription;

  gastosMes = computed(() => {
    const hoy = new Date();
    const m = hoy.getMonth();
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return this.financiero().find(f => f.mes === meses[m])?.gastos ?? 0;
  });

  chartBars = computed(() => {
    const arr = this.data()?.ingresosMensuales ?? [];
    if (!arr.length) return [];
    const max = Math.max(...arr.map(i => i.ingresos), 1);
    const hoy = new Date();
    return arr.slice(-6).map(item => ({
      label: ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][item._id.mes],
      pct: Math.round((item.ingresos / max) * 100),
      current: item._id.mes === hoy.getMonth() + 1 && item._id.anio === hoy.getFullYear(),
    }));
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
}
