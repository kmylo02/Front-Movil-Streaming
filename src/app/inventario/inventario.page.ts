import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonList, IonItem, IonLabel,
  IonModal, IonInput, IonSelect, IonSelectOption, IonToggle, IonBadge,
  IonSpinner, AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, checkmarkOutline, pencilOutline, trashOutline, eyeOutline } from 'ionicons/icons';
import { InventarioApiService, ServiciosApiService, Cuenta, Servicio } from '../core/services/api.service';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonCard, IonCardContent, IonList, IonItem, IonLabel,
    IonModal, IonInput, IonSelect, IonSelectOption, IonToggle, IonBadge,
    IonSpinner,
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
      @if (resumen()) {
        <div class="resumen-scroll">
          @for (item of resumenEntries(); track item.nombre) {
            <div class="resumen-chip" [style.--rc]="item.color">
              <div class="rc-icon">{{ item.icono }}</div>
              <div class="rc-info">
                <div class="rc-name">{{ item.nombre }}</div>
                <div class="rc-stat"><span class="rc-free">{{ item.libres }}</span>/{{ item.total }}</div>
              </div>
            </div>
          }
        </div>
      }

      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <div class="cuentas-list">
          @for (c of cuentas(); track c._id) {
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
              <ion-input [(ngModel)]="form.clave" type="password" placeholder="Contraseña"></ion-input>
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
  `,
  styles: [`
    .loading-c { display:flex; justify-content:center; padding:60px 0; }
    .resumen-scroll { display:flex; gap:10px; overflow-x:auto; padding:12px 16px; scrollbar-width:none; }
    .resumen-chip {
      display:flex; align-items:center; gap:8px; flex-shrink:0;
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08);
      border-radius:12px; padding:8px 12px; min-width:100px;
    }
    .rc-icon { font-size:18px; }
    .rc-name { font-size:11px; color:rgba(241,245,249,0.5); }
    .rc-stat { font-size:13px; font-weight:700; }
    .rc-free { color:var(--sm-emerald, #10b981); }
    .cuentas-list { padding:8px 16px 80px; display:flex; flex-direction:column; gap:10px; }
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

  resumenEntries = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    return Object.entries(r).map(([nombre, data]: [string, any]) => ({
      nombre, color: data.color || '#7c3aed', icono: data.icono || '📺',
      total: data.totalPerfiles || 0, libres: data.perfilesLibres || 0,
    }));
  });

  constructor(
    private inventarioApi: InventarioApiService,
    private serviciosApi: ServiciosApiService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, closeOutline, checkmarkOutline, pencilOutline, trashOutline, eyeOutline });
  }

  ngOnInit() {
    this.serviciosApi.getAll(true).subscribe(s => this.servicios.set(s));
    this.load();
  }

  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  async load() {
    this.loading.set(true);
    await Promise.all([
      new Promise<void>(res => this.inventarioApi.getAll().subscribe(c => { this.cuentas.set(c); res(); })),
      new Promise<void>(res => this.inventarioApi.getResumen().subscribe(r => { this.resumen.set(r); res(); })),
    ]);
    this.loading.set(false);
  }

  libres(c: Cuenta): number { return c.perfiles?.filter(p => !p.ocupado).length ?? 0; }

  openModal(c?: Cuenta) {
    this.editando.set(c || null);
    this.form = c ? { ...c } : { tipo: 'compartida', totalPerfiles: 4 };
    this.showModal.set(true);
  }

  async guardar() {
    if (!this.form.email || !this.form.nombreServicio) return;
    this.saving.set(true);
    try {
      if (this.editando()) {
        await new Promise<void>(res => this.inventarioApi.update(this.editando()!._id, this.form).subscribe(() => res()));
      } else {
        await new Promise<void>(res => this.inventarioApi.create(this.form).subscribe(() => res()));
      }
      this.showModal.set(false);
      await this.load();
      const t = await this.toastCtrl.create({ message: 'Guardado', duration: 2000, color: 'success' });
      t.present();
    } finally { this.saving.set(false); }
  }

  async toggleCuenta(c: Cuenta) {
    await new Promise<void>(res => this.inventarioApi.toggle(c._id).subscribe(() => res()));
    await this.load();
  }

  async eliminar(c: Cuenta) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cuenta',
      message: `¿Eliminar ${c.email}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: async () => {
          await new Promise<void>(res => this.inventarioApi.delete(c._id).subscribe(() => res()));
          await this.load();
        }},
      ],
    });
    await alert.present();
  }
}
