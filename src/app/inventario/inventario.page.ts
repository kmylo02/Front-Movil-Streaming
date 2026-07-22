import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonItem, IonLabel,
  IonModal, IonInput, IonSelect, IonSelectOption, IonToggle, IonBadge,
  IonSpinner, IonSearchbar, AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, checkmarkOutline, pencilOutline, trashOutline, eyeOutline, copyOutline } from 'ionicons/icons';
import { InventarioApiService, ServiciosApiService, Cuenta, Servicio } from '../core/services/api.service';
import { Clipboard } from '@capacitor/clipboard';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonItem, IonLabel,
    IonModal, IonInput, IonSelect, IonSelectOption, IonToggle, IonBadge,
    IonSpinner, IonSearchbar,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Inventario</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openModal()"><ion-icon name="add-outline" slot="icon-only"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Resumen por plataforma -->
      @if (resumenEntries().length > 0) {
        <div class="resumen-scroll">
          @for (item of resumenEntries(); track item.nombre) {
            <div class="resumen-chip" [class.chip-active]="plataformasSeleccionadas().has(item.nombre)"
                 (click)="toggleFiltroServicio(item.nombre)">
              <div class="rc-name">{{ item.nombre }}</div>
              <div class="rc-stat"><span class="rc-free">{{ item.libres }}</span>/{{ item.total }}</div>
            </div>
          }
        </div>
      }

      <!-- Filtro búsqueda -->
      <ion-searchbar [ngModel]="busqueda()" (ngModelChange)="busqueda.set($event)"
                     placeholder="Buscar por email…" debounce="300"></ion-searchbar>

      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <div class="cuentas-list">
          @for (c of cuentasFiltradas(); track c._id) {
            <div class="cuenta-card" [class.cuenta-inactiva]="!c.activa">
              <div class="cuenta-top">
                <div class="cuenta-plat">{{ c.nombreServicio }}</div>
                <ion-badge [color]="c.activa ? 'success' : 'medium'">{{ c.activa ? 'Activa' : 'Inactiva' }}</ion-badge>
              </div>
              <div class="cuenta-email">{{ c.email }}</div>
              <div class="perfiles-row">
                @for (p of c.perfiles; track p.numero) {
                  <div class="perfil-pip" [class.pip-occ]="p.ocupado" [title]="p.ocupado ? p.clienteNombre || 'Ocupado' : 'Libre'"></div>
                }
                <span class="perfiles-txt">{{ libres(c) }}/{{ c.totalPerfiles }} libres</span>
              </div>
              <div class="cuenta-actions">
                <button class="act-btn" (click)="openModal(c)">
                  <ion-icon name="pencil-outline"></ion-icon>
                </button>
                <button class="act-btn act-toggle" (click)="toggleCuenta(c)">
                  {{ c.activa ? 'Desactivar' : 'Activar' }}
                </button>
                <button class="act-btn act-del" (click)="eliminar(c)">
                  <ion-icon name="trash-outline"></ion-icon>
                </button>
              </div>
            </div>
          }
          @if (cuentasFiltradas().length === 0) {
            <div class="empty-msg">Sin resultados para este filtro</div>
          }
        </div>
      }
    </ion-content>

    <!-- Create / Edit Modal -->
    <ion-modal [isOpen]="showModal()" (didDismiss)="showModal.set(false)">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button (click)="showModal.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
            <ion-title>{{ editando() ? 'Editar' : 'Nueva' }} Cuenta</ion-title>
            <ion-buttons slot="end">
              <ion-button [disabled]="saving()" (click)="guardar()" color="primary">
                @if (saving()) { <ion-spinner name="crescent" style="width:20px;height:20px"></ion-spinner> }
                @else { Guardar }
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="modal-form">
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Plataforma *</ion-label>
              <ion-select [(ngModel)]="form.nombreServicio" interface="action-sheet">
                @for (s of servicios(); track s._id) {
                  <ion-select-option [value]="s.nombre">{{ s.nombre }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Tipo</ion-label>
              <ion-select [(ngModel)]="form.tipo" interface="action-sheet">
                <ion-select-option value="compartida">Compartida (perfiles)</ion-select-option>
                <ion-select-option value="individual">Individual</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Email *</ion-label>
              <ion-input [(ngModel)]="form.email" type="email" placeholder="cuenta@gmail.com"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Clave</ion-label>
              <ion-input [(ngModel)]="form.clave" type="text" placeholder="Contraseña"></ion-input>
              <ion-button slot="end" fill="clear" size="small" (click)="generarClave()">Generar</ion-button>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Total perfiles</ion-label>
              <ion-input [(ngModel)]="form.totalPerfiles" type="number" placeholder="4"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Valor cuenta ($)</ion-label>
              <ion-input [(ngModel)]="form.valorCuenta" type="number" placeholder="0"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Valor pantalla ($)</ion-label>
              <ion-input [(ngModel)]="form.valorPantalla" type="number" placeholder="0"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Fecha inicio</ion-label>
              <ion-input [(ngModel)]="form.fechaInicioCuenta" type="date"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Fecha vencimiento</ion-label>
              <ion-input [(ngModel)]="form.fechaVencimientoCuenta" type="date"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label>Renovable</ion-label>
              <ion-toggle [(ngModel)]="form.renovable" slot="end"></ion-toggle>
            </ion-item>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>

    <!-- Modal clientes afectados por cambio de clave -->
    <ion-modal [isOpen]="showAfectados()" (didDismiss)="showAfectados.set(false)">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button (click)="showAfectados.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
            <ion-title>Clientes afectados</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="afect-intro">
            <div class="afect-icon">🔑</div>
            <div class="afect-title">La clave fue actualizada</div>
            <div class="afect-sub">{{ clientesAfectados().length }} cliente(s) usan esta cuenta. Envíales el mensaje actualizado.</div>
          </div>
          @for (c of clientesAfectados(); track c.clienteId) {
            <div class="afect-card">
              <div class="afect-nombre">{{ c.nombreCliente }}</div>
              <div class="afect-estado">{{ c.estado }}</div>
              <div class="afect-msg">{{ c.mensaje }}</div>
              <button class="afect-copy-btn" (click)="copiarMensaje(c.mensaje)">
                <ion-icon name="copy-outline"></ion-icon> Copiar mensaje
              </button>
            </div>
          }
          @if (clientesAfectados().length === 0) {
            <div class="afect-empty">No hay clientes activos usando esta cuenta.</div>
          }
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .loading-c { display:flex; justify-content:center; padding:60px 0; }
    .resumen-scroll { display:flex; gap:8px; overflow-x:auto; padding:12px 16px 4px; scrollbar-width:none; }
    .resumen-chip {
      display:flex; flex-direction:column; flex-shrink:0;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
      border-radius:12px; padding:8px 14px; min-width:80px; cursor:pointer;
      transition: all 0.18s;
    }
    .resumen-chip.chip-active { background:rgba(124,58,237,0.15); border-color:rgba(124,58,237,0.4); }
    .rc-name { font-size:11px; color:rgba(241,245,249,0.5); margin-bottom:2px; }
    .rc-stat { font-size:14px; font-weight:700; }
    .rc-free { color:#10b981; }
    .cuentas-list { padding:4px 16px 80px; display:flex; flex-direction:column; gap:10px; }
    .empty-msg { text-align:center; color:rgba(241,245,249,0.3); padding:40px 0; font-size:14px; }
    .cuenta-card { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:14px; }
    .cuenta-inactiva { opacity:0.5; }
    .cuenta-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:6px; }
    .cuenta-plat { font-size:14px; font-weight:700; color:#f1f5f9; }
    .cuenta-email { font-size:12px; font-family:monospace; color:rgba(241,245,249,0.5); margin-bottom:10px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .perfiles-row { display:flex; align-items:center; gap:4px; margin-bottom:10px; }
    .perfil-pip { width:10px; height:10px; border-radius:3px; background:rgba(16,185,129,0.6); }
    .pip-occ { background:rgba(124,58,237,0.6); }
    .perfiles-txt { font-size:11px; color:rgba(241,245,249,0.4); margin-left:4px; }
    .cuenta-actions { display:flex; gap:8px; }
    .act-btn { border-radius:8px; padding:6px 10px; font-size:12px; font-weight:600; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:rgba(241,245,249,0.6); display:flex; align-items:center; gap:4px; }
    .act-toggle { flex:1; justify-content:center; }
    .act-del { color:#f43f5e; border-color:rgba(244,63,94,0.2); background:rgba(244,63,94,0.08); }
    .modal-form { padding:16px; display:flex; flex-direction:column; gap:8px; }
    .f-item { --background:rgba(255,255,255,0.05); --border-radius:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; }
    .afect-intro { text-align:center; padding:24px 20px 12px; }
    .afect-icon { font-size:36px; margin-bottom:8px; }
    .afect-title { font-size:17px; font-weight:700; color:#f1f5f9; margin-bottom:4px; }
    .afect-sub { font-size:13px; color:rgba(241,245,249,0.45); }
    .afect-card { margin:8px 16px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:14px; padding:14px; }
    .afect-nombre { font-size:15px; font-weight:700; color:#f1f5f9; margin-bottom:2px; }
    .afect-estado { font-size:11px; color:rgba(241,245,249,0.35); margin-bottom:10px; }
    .afect-msg { font-size:11px; font-family:monospace; color:rgba(241,245,249,0.6); background:rgba(0,0,0,0.25); border-radius:8px; padding:10px; white-space:pre-wrap; line-height:1.6; max-height:160px; overflow-y:auto; margin-bottom:10px; }
    .afect-copy-btn { width:100%; background:rgba(124,58,237,0.15); border:1px solid rgba(124,58,237,0.3); border-radius:10px; padding:10px; color:#a78bfa; font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; }
    .afect-empty { text-align:center; color:rgba(241,245,249,0.3); padding:40px 20px; font-size:14px; }
  `],
})
export class InventarioPage implements OnInit {
  loading = signal(true);
  cuentas = signal<Cuenta[]>([]);
  servicios = signal<Servicio[]>([]);
  resumen = signal<Record<string, any> | null>(null);
  showModal = signal(false);
  editando = signal<Cuenta | null>(null);
  saving = signal(false);
  form: Partial<Cuenta> & { renovable?: boolean } = {};

  busqueda = signal('');
  plataformasSeleccionadas = signal<Set<string>>(new Set());
  claveOriginal = '';

  showAfectados = signal(false);
  clientesAfectados = signal<any[]>([]);

  resumenEntries = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    return Object.entries(r).map(([nombre, data]: [string, any]) => ({
      nombre,
      total: data.total || 0,
      libres: data.disponibles || 0,
    }));
  });

  cuentasFiltradas = computed(() => {
    let list = this.cuentas();
    const plataformas = this.plataformasSeleccionadas();
    const q = this.busqueda().toLowerCase().trim();
    if (plataformas.size > 0) list = list.filter(c => plataformas.has(c.nombreServicio));
    if (q) list = list.filter(c => c.email.toLowerCase().includes(q));
    return list;
  });

  constructor(
    private inventarioApi: InventarioApiService,
    private serviciosApi: ServiciosApiService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, closeOutline, checkmarkOutline, pencilOutline, trashOutline, eyeOutline, copyOutline });
  }

  ngOnInit() {
    this.serviciosApi.getAll(true).subscribe(s => this.servicios.set(s));
    this.load();
  }

  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  async load() {
    this.loading.set(true);
    await Promise.all([
      new Promise<void>(res => this.inventarioApi.getAll().subscribe({ next: c => { this.cuentas.set(c); res(); }, error: () => res() })),
      new Promise<void>(res => this.inventarioApi.getResumen().subscribe({ next: r => { this.resumen.set(r); res(); }, error: () => res() })),
    ]);
    this.loading.set(false);
  }

  libres(c: Cuenta): number { return c.perfiles?.filter(p => !p.ocupado).length ?? 0; }

  toggleFiltroServicio(nombre: string) {
    const set = new Set(this.plataformasSeleccionadas());
    if (set.has(nombre)) set.delete(nombre); else set.add(nombre);
    this.plataformasSeleccionadas.set(set);
  }

  openModal(c?: Cuenta) {
    this.editando.set(c || null);
    this.claveOriginal = c?.clave || '';
    this.form = c ? { ...c } : { tipo: 'compartida', totalPerfiles: 4 };
    this.showModal.set(true);
  }

  private static readonly PALABRAS_CLAVE = [
    'tigre', 'leon', 'lobo', 'oso', 'aguila', 'halcon', 'pantera', 'jaguar', 'cobra',
    'dragon', 'fenix', 'titan', 'atomo', 'cosmos', 'planeta', 'estrella', 'cometa',
    'trueno', 'rayo', 'fuego', 'hielo', 'volcan', 'tornado', 'huracan', 'bosque', 'rio',
  ];

  generarClave() {
    const palabras = InventarioPage.PALABRAS_CLAVE;
    const elegir = () => palabras[Math.floor(Math.random() * palabras.length)];
    const w1 = elegir();
    let w2 = elegir();
    while (w2 === w1) w2 = elegir();

    const transformar = (w: string) => {
      let t = w.replace(/e/g, '3').replace(/i/g, '1');
      const posiciones = [...t].map((c, i) => (/[a-z]/.test(c) ? i : -1)).filter(i => i >= 0);
      const idx = posiciones[Math.floor(Math.random() * posiciones.length)];
      return t.slice(0, idx) + t[idx].toUpperCase() + t.slice(idx + 1);
    };

    const digitos = '0123456789';
    const letras = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
    const rand = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
    const sufijo = rand(digitos) + rand(digitos) + rand(letras);

    this.form.clave = `#${transformar(w1)}-${transformar(w2)}*${sufijo}`;
  }

  async guardar() {
    if (!this.form.email || !this.form.nombreServicio) return;
    this.saving.set(true);
    const claveNueva = this.form.clave;
    const claveCambio = !!this.editando() && !!claveNueva && claveNueva !== this.claveOriginal;
    const cuentaId = this.editando()?._id;
    try {
      if (this.editando()) {
        await new Promise<void>(res => this.inventarioApi.update(this.editando()!._id, this.form).subscribe({ next: () => res(), error: () => res() }));
      } else {
        await new Promise<void>(res => this.inventarioApi.create(this.form).subscribe({ next: () => res(), error: () => res() }));
      }
      this.showModal.set(false);
      await this.load();
      const t = await this.toastCtrl.create({ message: 'Guardado', duration: 2000, color: 'success' });
      t.present();

      if (claveCambio && cuentaId) {
        this.inventarioApi.getClientesAfectados(cuentaId).subscribe({
          next: clientes => {
            this.clientesAfectados.set(clientes);
            this.showAfectados.set(true);
          },
          error: () => {},
        });
      }
    } finally { this.saving.set(false); }
  }

  async copiarMensaje(mensaje: string) {
    try {
      await Clipboard.write({ string: mensaje });
      const t = await this.toastCtrl.create({ message: 'Mensaje copiado', duration: 1800, color: 'dark' });
      t.present();
    } catch {
      const t = await this.toastCtrl.create({ message: 'No se pudo copiar', duration: 1800, color: 'danger' });
      t.present();
    }
  }

  async toggleCuenta(c: Cuenta) {
    await new Promise<void>(res => this.inventarioApi.toggle(c._id).subscribe({ next: () => res(), error: () => res() }));
    await this.load();
  }

  async eliminar(c: Cuenta) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cuenta',
      message: `¿Eliminar ${c.email}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: async () => {
          await new Promise<void>(res => this.inventarioApi.delete(c._id).subscribe({ next: () => res(), error: () => res() }));
          await this.load();
        }},
      ],
    });
    await alert.present();
  }
}
