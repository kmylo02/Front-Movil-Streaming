import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonChip, IonBadge,
  IonSpinner, NavController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, linkOutline, trendingUpOutline } from 'ionicons/icons';
import { ReportsApiService, ServiciosApiService, PlataformasReport, PlataformaClienteItem, Servicio } from '../core/services/api.service';

@Component({
  selector: 'app-plataformas-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonChip, IonBadge,
    IonSpinner,
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
      } @else if (report()) {
        <!-- Platform Chips -->
        <div class="plat-chips">
          @for (p of report()!.plataformas; track p.nombre) {
            <button class="plat-chip" [class.chip-active]="plataformaActiva() === p.nombre"
              [style.--pc]="getColor(p.nombre)" (click)="seleccionar(p.nombre)">
              <span class="pc-icon">{{ getIcono(p.nombre) }}</span>
              <span class="pc-name">{{ p.nombre }}</span>
              <span class="pc-count">{{ p.totalActivos }}</span>
            </button>
          }
          @if (report()!.plataformas.length === 0) {
            <div class="sel-msg">Sin datos de plataformas activas todavía.</div>
          }
        </div>

        @if (clientesActivos().length > 0 || plataformaActiva()) {
          <ion-card class="rep-card">
            <ion-card-content>
              <div class="rep-table-title">Clientes de {{ plataformaActiva() }}</div>
              @if (clientesActivos().length === 0) {
                <div class="sel-msg">Sin suscriptores activos.</div>
              }
              @for (c of clientesActivos(); track c.clienteId) {
                <div class="rep-row">
                  <div class="rep-cli">
                    <div class="rep-nombre">{{ c.nombre }}</div>
                    @if (c.emailCuenta) {
                      <div class="rep-cuenta">
                        {{ c.emailCuenta }}
                        @if (c.numeroPerfil) { · Perfil {{ c.numeroPerfil }} }
                      </div>
                    }
                  </div>
                  @if (c.otrasPlataformas.length > 0) {
                    <div class="otras-plt">
                      @for (op of c.otrasPlataformas; track op) {
                        <ion-chip class="combo-chip" [style.--pc]="getColor(op)">{{ op }}</ion-chip>
                      }
                    </div>
                  } @else {
                    <span class="chip-solo">Solo esta</span>
                  }
                </div>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- Combos -->
        @if (report()!.combos.length > 0) {
          <ion-card class="rep-card">
            <ion-card-content>
              <div class="rep-table-title">
                <ion-icon name="link-outline" style="vertical-align:middle;margin-right:4px"></ion-icon>
                Combos frecuentes
              </div>
              @for (combo of report()!.combos; track combo.plataformas.join()) {
                <div class="combo-row">
                  <div class="combo-chips">
                    @for (n of combo.plataformas; track n) {
                      <ion-chip class="combo-chip" [style.--pc]="getColor(n)">{{ n }}</ion-chip>
                    }
                  </div>
                  <div class="combo-cnt">{{ combo.clientes.length }} clientes</div>
                </div>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- Upsell -->
        @if (report()!.sinCombinar.length > 0) {
          <ion-card class="rep-card">
            <ion-card-content>
              <div class="rep-table-title">
                <ion-icon name="trending-up-outline" style="vertical-align:middle;margin-right:4px;color:#10b981"></ion-icon>
                Oportunidades de upsell
              </div>
              @for (u of report()!.sinCombinar; track u.clienteId) {
                <div class="upsell-row">
                  <div class="upsell-nombre">{{ u.nombre }}</div>
                  <ion-badge color="secondary" class="upsell-badge" [style.--pc]="getColor(u.plataforma)">{{ u.plataforma }}</ion-badge>
                </div>
              }
            </ion-card-content>
          </ion-card>
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
    .rep-table-title { font-size:12px; font-weight:700; color:rgba(241,245,249,0.5); margin-bottom:10px; }
    .rep-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); gap:8px; }
    .rep-row:last-child { border-bottom:none; }
    .rep-nombre { font-size:13px; font-weight:600; color:#f1f5f9; }
    .rep-cuenta { font-size:11px; color:rgba(241,245,249,0.4); margin-top:2px; font-family:monospace; }
    .otras-plt { display:flex; flex-wrap:wrap; gap:4px; justify-content:flex-end; }
    .chip-solo { font-size:11px; color:rgba(241,245,249,0.3); font-style:italic; flex-shrink:0; }
    .combo-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); gap:8px; }
    .combo-chips { display:flex; flex-wrap:wrap; gap:4px; }
    .combo-chip { --background:rgba(var(--pc-rgb,124,58,237),0.1); --color:var(--pc,#a78bfa); font-size:11px; height:22px; }
    .combo-cnt { font-size:12px; color:rgba(241,245,249,0.4); flex-shrink:0; margin-left:8px; }
    .upsell-row { display:flex; align-items:center; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05); gap:8px; }
    .upsell-nombre { font-size:13px; font-weight:600; color:#f1f5f9; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .upsell-badge { font-size:10px; }
    .sel-msg { text-align:center; color:rgba(241,245,249,0.3); padding:24px 16px; font-size:13px; }
  `],
})
export class PlataformasReportPage implements OnInit {
  loading = signal(true);
  report = signal<PlataformasReport | null>(null);
  servicios = signal<Servicio[]>([]);
  plataformaActiva = signal('');

  clientesActivos = computed<PlataformaClienteItem[]>(() => {
    const r = this.report();
    const p = this.plataformaActiva();
    if (!r || !p) return [];
    return r.plataformas.find(x => x.nombre === p)?.clientes ?? [];
  });

  private colorMap = computed(() => {
    const m = new Map<string, string>();
    for (const s of this.servicios()) m.set(s.nombre, s.color);
    return m;
  });

  private iconoMap = computed(() => {
    const m = new Map<string, string>();
    for (const s of this.servicios()) m.set(s.nombre, s.icono);
    return m;
  });

  constructor(
    private reportsApi: ReportsApiService,
    private serviciosApi: ServiciosApiService,
    public navCtrl: NavController,
  ) {
    addIcons({ chevronBackOutline, linkOutline, trendingUpOutline });
  }

  ngOnInit() { this.load(); }

  async load() {
    this.loading.set(true);
    await Promise.all([
      new Promise<void>(res => this.reportsApi.getPlataformas().subscribe({
        next: data => {
          this.report.set(data);
          if (data.plataformas.length > 0) this.plataformaActiva.set(data.plataformas[0].nombre);
          res();
        },
        error: () => res(),
      })),
      new Promise<void>(res => this.serviciosApi.getAll(true).subscribe({
        next: data => { this.servicios.set(data); res(); },
        error: () => res(),
      })),
    ]);
    this.loading.set(false);
  }

  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  seleccionar(nombre: string) {
    this.plataformaActiva.set(nombre);
  }

  getColor(nombre: string): string {
    return this.colorMap().get(nombre) || '#64748b';
  }

  getIcono(nombre: string): string {
    return this.iconoMap().get(nombre) || '📺';
  }
}
