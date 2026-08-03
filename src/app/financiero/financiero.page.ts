import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonSelect, IonSelectOption,
  IonItem, IonLabel, IonSpinner, NavController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronDownOutline } from 'ionicons/icons';
import { ReportsApiService, FinancieroMes } from '../core/services/api.service';

@Component({
  selector: 'app-financiero',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonSelect, IonSelectOption,
    IonItem, IonLabel, IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="navCtrl.back()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Financiero</ion-title>
        <ion-buttons slot="end">
          <ion-item lines="none" class="year-select">
            <ion-select [(ngModel)]="anio" (ngModelChange)="load()" interface="popover">
              @for (y of years; track y) { <ion-select-option [value]="y">{{ y }}</ion-select-option> }
            </ion-select>
          </ion-item>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <!-- Totales -->
        <div class="totales-row">
          <div class="total-card">
            <div class="total-val" style="color:#10b981">{{ fmt(totalIngresos()) }}</div>
            <div class="total-lbl">Ingresos {{ anio }}</div>
          </div>
          <div class="total-card">
            <div class="total-val" style="color:#f43f5e">{{ fmt(totalGastos()) }}</div>
            <div class="total-lbl">Gastos {{ anio }}</div>
          </div>
          <div class="total-card">
            <div class="total-val" [style.color]="totalNeto() >= 0 ? '#a78bfa' : '#f43f5e'">{{ fmt(totalNeto()) }}</div>
            <div class="total-lbl">Neto {{ anio }} · margen {{ margenTotal() }}%</div>
          </div>
        </div>

        <!-- Bar chart stacked -->
        @if (data().length > 0) {
          <ion-card class="chart-card">
            <ion-card-content>
              <div class="chart-title">Ingresos vs Gastos ({{ anio }})</div>
              <div class="stacked-chart">
                @for (m of data(); track m.mes) {
                  <div class="s-col">
                    <div class="s-bars">
                      <div class="s-bar s-ing" [style.height.px]="barH(m.ingresos)" title="Ingresos: {{ fmt(m.ingresos) }}"></div>
                      <div class="s-bar s-gas" [style.height.px]="barH(m.gastos)" title="Gastos: {{ fmt(m.gastos) }}"></div>
                    </div>
                    <div class="s-lbl">{{ m.mes.slice(0,3) }}</div>
                  </div>
                }
              </div>
              <div class="legend-row">
                <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div>Ingresos</div>
                <div class="legend-item"><div class="legend-dot" style="background:#f43f5e"></div>Gastos</div>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- Monthly table -->
        <ion-card class="table-card">
          <ion-card-content>
            <div class="table-title">Detalle mensual</div>
            <div class="fin-table">
              <div class="fin-th">
                <div class="fin-td">Mes</div>
                <div class="fin-td r">Ingresos</div>
                <div class="fin-td r">Gastos</div>
                <div class="fin-td r">Neto</div>
                <div class="fin-td r">Margen</div>
              </div>
              @for (m of data(); track m.mes) {
                <div class="fin-tr">
                  <div class="fin-td">{{ m.mes }}</div>
                  <div class="fin-td r" style="color:#10b981">{{ fmt(m.ingresos) }}</div>
                  <div class="fin-td r" style="color:#f43f5e">{{ fmt(m.gastos) }}</div>
                  <div class="fin-td r" [style.color]="m.ganancia >= 0 ? '#a78bfa' : '#f43f5e'">
                    {{ fmt(m.ganancia) }}
                  </div>
                  <div class="fin-td r" [style.color]="m.ganancia >= 0 ? '#a78bfa' : '#f43f5e'">
                    @if (m.ingresos > 0) { {{ margen(m) }}% } @else { — }
                  </div>
                </div>
              }
            </div>
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `,
  styles: [`
    .loading-c { display:flex; justify-content:center; padding:60px 0; }
    .year-select { --background:transparent; --inner-padding-end:0; }
    .totales-row { display:flex; gap:10px; padding:14px 16px 6px; }
    .total-card { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:12px 10px; text-align:center; }
    .total-val { font-size:16px; font-weight:900; letter-spacing:-0.02em; margin-bottom:3px; }
    .total-lbl { font-size:10px; color:rgba(241,245,249,0.35); }
    .chart-card, .table-card { margin:8px 16px; }
    .chart-title, .table-title { font-size:12px; font-weight:700; color:rgba(241,245,249,0.5); margin-bottom:12px; }
    .stacked-chart { display:flex; align-items:flex-end; gap:2px; height:80px; }
    .s-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; height:100%; justify-content:flex-end; }
    .s-bars { display:flex; gap:1px; align-items:flex-end; width:100%; }
    .s-bar { flex:1; border-radius:2px 2px 0 0; min-height:2px; }
    .s-ing { background:#10b981; }
    .s-gas { background:#f43f5e; }
    .s-lbl { font-size:8px; color:rgba(241,245,249,0.3); margin-top:2px; }
    .legend-row { display:flex; gap:14px; margin-top:12px; }
    .legend-item { display:flex; align-items:center; gap:5px; font-size:11px; color:rgba(241,245,249,0.5); }
    .legend-dot { width:8px; height:8px; border-radius:2px; flex-shrink:0; }
    .fin-table { font-size:12px; }
    .fin-th { display:flex; padding:6px 4px; border-bottom:1px solid rgba(255,255,255,0.1); }
    .fin-th .fin-td { font-size:10px; font-weight:700; color:rgba(241,245,249,0.4); letter-spacing:0.04em; text-transform:uppercase; }
    .fin-tr { display:flex; padding:8px 4px; border-bottom:1px solid rgba(255,255,255,0.05); }
    .fin-tr:last-child { border-bottom:none; }
    .fin-td { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .fin-td.r { text-align:right; font-variant-numeric:tabular-nums; }
  `],
})
export class FinancieroPage implements OnInit {
  loading = signal(true);
  data = signal<FinancieroMes[]>([]);
  anio = new Date().getFullYear();
  years = [new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2];
  private MAX_H = 64;

  totalIngresos = computed(() => this.data().reduce((s, m) => s + m.ingresos, 0));
  totalGastos = computed(() => this.data().reduce((s, m) => s + m.gastos, 0));
  totalNeto = computed(() => this.data().reduce((s, m) => s + m.ganancia, 0));

  constructor(private reportsApi: ReportsApiService, public navCtrl: NavController) {
    addIcons({ chevronBackOutline, chevronDownOutline });
  }

  ngOnInit() { this.load(); }
  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  async load() {
    this.loading.set(true);
    await new Promise<void>(res => this.reportsApi.getFinanciero(this.anio).subscribe(d => { this.data.set(d); res(); }));
    this.loading.set(false);
  }

  barH(val: number): number {
    const max = Math.max(...this.data().flatMap(m => [m.ingresos, m.gastos]), 1);
    return Math.max(2, Math.round((val / max) * this.MAX_H));
  }

  fmt(val: number): string {
    if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}k`;
    return `$${val}`;
  }

  margen(m: FinancieroMes): number {
    if (!m.ingresos) return 0;
    return Math.round((m.ganancia / m.ingresos) * 100);
  }

  margenTotal(): number {
    const ing = this.totalIngresos();
    if (!ing) return 0;
    return Math.round((this.totalNeto() / ing) * 100);
  }
}
