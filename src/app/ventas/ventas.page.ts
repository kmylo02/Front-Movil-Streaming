import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
  IonList, IonItem, IonBadge, IonChip, IonModal, IonSpinner, IonFab, IonFabButton,
  IonSelect, IonSelectOption, IonInput, IonActionSheet, AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, refreshOutline, trashOutline, pencilOutline, closeOutline,
  filmOutline, calendarOutline, chevronForwardOutline, ellipsisVerticalOutline,
  pauseCircleOutline, playCircleOutline, chatbubbleOutline, copyOutline, checkmarkOutline,
} from 'ionicons/icons';
import { VentasApiService, Venta, ClientesApiService, Cliente, ServiciosApiService, Servicio, InventarioApiService } from '../core/services/api.service';
import { VentaEventsService } from '../core/services/venta-events.service';
import { NavController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonSearchbar, IonSegment, IonSegmentButton, IonLabel,
    IonList, IonItem, IonBadge, IonChip, IonModal, IonSpinner, IonFab, IonFabButton,
    IonSelect, IonSelectOption, IonInput, IonActionSheet,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Ventas</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="navCtrl.navigateForward('/tabs/ventas/nueva')">
            <ion-icon name="add-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-searchbar [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)" placeholder="Buscar cliente…" debounce="300"></ion-searchbar>

      <div class="seg-wrap">
        <ion-segment [ngModel]="estadoFiltro()" (ngModelChange)="estadoFiltro.set($event)" scrollable>
          <ion-segment-button value="all"><ion-label>Todas</ion-label></ion-segment-button>
          <ion-segment-button value="activa"><ion-label>Activas</ion-label></ion-segment-button>
          <ion-segment-button value="por_vencer"><ion-label>Por vencer</ion-label></ion-segment-button>
          <ion-segment-button value="vencida"><ion-label>Vencidas</ion-label></ion-segment-button>
          <ion-segment-button value="pausada"><ion-label>Pausadas</ion-label></ion-segment-button>
        </ion-segment>
      </div>

      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <div class="ventas-list">
          @for (v of ventasFiltradas(); track v._id) {
            <div class="venta-card" [class]="'estado-' + v.estado" (click)="openActions(v)">
              <div class="venta-accent"></div>
              <div class="venta-body">
                <div class="venta-top">
                  <div>
                    <div class="venta-cliente">{{ v.nombreCliente }}</div>
                    @if (telefonoDeCliente(v.clienteId); as tel) {
                      <div class="venta-tel">📱 {{ tel }}</div>
                    }
                  </div>
                  <ion-badge [color]="badgeColor(v.estado)">{{ estadoLabel(v.estado) }}</ion-badge>
                </div>
                <div class="venta-svcs">
                  @for (s of v.servicios; track s.servicioId) {
                    <ion-chip class="svc-chip">{{ s.nombreServicio }}</ion-chip>
                  }
                </div>
                <div class="venta-foot">
                  <span class="venta-monto">{{ '$' + v.monto.toLocaleString('es-CO') }}</span>
                  <span class="venta-date">Vence {{ v.fechaVencimiento | date:'dd MMM yyyy' }}</span>
                </div>
              </div>
            </div>
          }
          @if (ventasFiltradas().length === 0 && !loading()) {
            <div class="empty-msg">No hay ventas con ese filtro</div>
          }
        </div>
      }
    </ion-content>

    <!-- Action Sheet via programmatic -->
    @if (ventaSeleccionada()) {
      <ion-action-sheet
        [isOpen]="showActions()"
        [header]="ventaSeleccionada()!.nombreCliente"
        [buttons]="actionButtons()"
        (didDismiss)="showActions.set(false)">
      </ion-action-sheet>
    }
  `,
  styles: [`
    .seg-wrap { padding: 4px 0 8px; }
    .loading-c { display: flex; justify-content: center; padding: 60px 0; }
    .ventas-list { padding: 4px 16px 80px; display: flex; flex-direction: column; gap: 10px; }
    .venta-card {
      display: flex; border-radius: 14px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      overflow: hidden;
    }
    .venta-accent { width: 4px; flex-shrink: 0; }
    .estado-activa .venta-accent { background: #10b981; }
    .estado-por_vencer .venta-accent { background: #f59e0b; }
    .estado-vencida .venta-accent { background: #f43f5e; }
    .estado-pausada .venta-accent { background: rgba(255,255,255,0.25); }
    .venta-body { flex: 1; padding: 12px 14px; }
    .venta-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .venta-cliente { font-size: 15px; font-weight: 700; color: #f1f5f9; }
    .venta-tel { font-size: 11px; color: rgba(241,245,249,0.4); margin-top: 2px; }
    .venta-svcs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
    .svc-chip { --background: rgba(124,58,237,0.12); --color: #a78bfa; font-size: 11px; height: 22px; }
    .venta-foot { display: flex; align-items: center; justify-content: space-between; }
    .venta-monto { font-size: 14px; font-weight: 700; color: #10b981; }
    .venta-date { font-size: 11px; color: rgba(241,245,249,0.4); }
    .empty-msg { text-align: center; color: rgba(241,245,249,0.3); padding: 60px 0; font-size: 14px; }
  `],
})
export class VentasPage implements OnInit {
  loading = signal(true);
  ventas = signal<Venta[]>([]);
  busqueda = signal('');
  estadoFiltro = signal('all');
  ventaSeleccionada = signal<Venta | null>(null);
  showActions = signal(false);
  private clientesPorId = new Map<string, Cliente>();

  ventasFiltradas = computed(() => {
    let list = this.ventas();
    if (this.estadoFiltro() !== 'all') list = list.filter(v => v.estado === this.estadoFiltro());
    if (this.busqueda().trim()) {
      const q = this.busqueda().toLowerCase();
      list = list.filter(v => v.nombreCliente.toLowerCase().includes(q));
    }
    return list;
  });

  actionButtons = computed(() => {
    const v = this.ventaSeleccionada();
    if (!v) return [];
    const btns: any[] = [
      { text: 'Editar', icon: 'pencil-outline', handler: () => this.navCtrl.navigateForward(`/tabs/ventas/editar/${v._id}`) },
      { text: 'Renovar', icon: 'refresh-outline', handler: () => this.renovar(v) },
      { text: 'Ver mensaje', icon: 'chatbubble-outline', handler: () => this.copiarMensaje(v) },
    ];
    if (v.estado === 'pausada') {
      btns.push({ text: 'Reactivar', icon: 'play-circle-outline', handler: () => this.reactivar(v) });
    } else if (v.estado !== 'vencida') {
      btns.push({ text: 'Pausar', icon: 'pause-circle-outline', handler: () => this.pausar(v) });
    }
    btns.push({ text: 'Cancelar venta', icon: 'close-outline', role: 'destructive', handler: () => this.cancelar(v) });
    btns.push({ text: 'Cerrar', role: 'cancel' });
    return btns;
  });

  constructor(
    private ventasApi: VentasApiService,
    private clientesApi: ClientesApiService,
    private ventaEvents: VentaEventsService,
    private route: ActivatedRoute,
    public navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, refreshOutline, trashOutline, pencilOutline, closeOutline,
      filmOutline, calendarOutline, chevronForwardOutline, ellipsisVerticalOutline,
      pauseCircleOutline, playCircleOutline, chatbubbleOutline, copyOutline, checkmarkOutline });
  }

  ngOnInit() {
    this.load();
    this.clientesApi.getAll().subscribe(cs => {
      this.clientesPorId = new Map(cs.map(c => [c._id, c]));
    });
  }

  ionViewWillEnter() {
    const nombre = this.route.snapshot.queryParams['nombre'];
    if (nombre) this.busqueda.set(nombre);
  }

  telefonoDeCliente(clienteId: string): string | undefined {
    return this.clientesPorId.get(clienteId)?.telefono;
  }

  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  async load() {
    this.loading.set(true);
    try {
      await new Promise<void>(res => this.ventasApi.getAll().subscribe(v => { this.ventas.set(v); res(); }));
    } finally { this.loading.set(false); }
  }

  openActions(v: Venta) {
    this.ventaSeleccionada.set(v);
    this.showActions.set(true);
  }

  async renovar(v: Venta) {
    const alert = await this.alertCtrl.create({
      header: 'Renovar venta',
      inputs: [
        { name: 'meses', type: 'number', placeholder: 'Meses (ej: 1)', min: 1, max: 12 },
        { name: 'monto', type: 'number', placeholder: 'Monto', min: 0 },
      ],
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Renovar',
          handler: async (data) => {
            const loading = await this.loadingCtrl.create({ message: 'Renovando…' });
            await loading.present();
            try {
              await new Promise<void>((res, rej) => this.ventasApi.renovar(v._id, +data.meses, +data.monto).subscribe({ next: () => res(), error: rej }));
              this.ventaEvents.notificar();
              await this.load();
              this.toast('Venta renovada');
            } catch (e: any) {
              this.toast(e?.error?.message || 'Error al renovar', 'danger');
            } finally { loading.dismiss(); }
          },
        },
      ],
    });
    await alert.present();
  }

  async pausar(v: Venta) {
    const loading = await this.loadingCtrl.create({ message: 'Pausando…' });
    await loading.present();
    try {
      await new Promise<void>((res, rej) => this.ventasApi.pausar(v._id).subscribe({ next: () => res(), error: rej }));
      await this.load();
      this.toast('Venta pausada');
    } catch (e: any) {
      this.toast(e?.error?.message || 'Error al pausar', 'danger');
    } finally { loading.dismiss(); }
  }

  async reactivar(v: Venta) {
    const loading = await this.loadingCtrl.create({ message: 'Reactivando…' });
    await loading.present();
    try {
      await new Promise<void>((res, rej) => this.ventasApi.update(v._id, { estado: 'activa' }).subscribe({ next: () => res(), error: rej }));
      await this.load();
      this.toast('Venta reactivada');
    } catch (e: any) {
      this.toast(e?.error?.message || 'Error al reactivar', 'danger');
    } finally { loading.dismiss(); }
  }

  async cancelar(v: Venta) {
    const confirm = await this.alertCtrl.create({
      header: 'Cancelar venta',
      message: `¿Cancelar la venta de ${v.nombreCliente}?`,
      buttons: [
        { text: 'No', role: 'cancel' },
        {
          text: 'Cancelar venta',
          role: 'destructive',
          handler: async () => {
            const loading = await this.loadingCtrl.create({ message: 'Cancelando…' });
            await loading.present();
            try {
              await new Promise<void>((res, rej) => this.ventasApi.cancelar(v._id).subscribe({ next: () => res(), error: rej }));
              await this.load();
              this.ventaEvents.notificar();
              this.toast('Venta cancelada');
            } catch (e: any) {
              this.toast(e?.error?.message || 'Error al cancelar', 'danger');
            } finally { loading.dismiss(); }
          },
        },
      ],
    });
    await confirm.present();
  }

  async copiarMensaje(v: Venta) {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: v.mensajeGenerado });
      this.toast('Mensaje copiado');
    } catch { this.toast('No se pudo copiar'); }
  }

  badgeColor(estado: string) {
    return { activa: 'success', por_vencer: 'warning', vencida: 'danger', pausada: 'medium' }[estado] || 'medium';
  }

  estadoLabel(e: string) {
    return { activa: 'Activa', por_vencer: 'Por vencer', vencida: 'Vencida', pausada: 'Pausada' }[e] || e;
  }

  async toast(msg: string, color: string = 'dark') {
    const t = await this.toastCtrl.create({ message: msg, duration: color === 'danger' ? 3000 : 2000, position: 'bottom', color });
    t.present();
  }
}
