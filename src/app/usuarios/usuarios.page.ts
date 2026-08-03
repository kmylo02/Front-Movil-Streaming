import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel, IonModal, IonInput,
  IonSelect, IonSelectOption, IonBadge, IonSpinner, NavController, AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, pencilOutline, trashOutline, chevronBackOutline, personOutline, keyOutline } from 'ionicons/icons';
import { UsuariosApiService, Usuario } from '../core/services/api.service';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonList, IonItem, IonLabel, IonModal, IonInput,
    IonSelect, IonSelectOption, IonBadge, IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="navCtrl.back()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Usuarios</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openModal()"><ion-icon name="add-outline" slot="icon-only"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-val">{{ total() }}</div>
          <div class="stat-lbl">Total</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:#10b981">{{ activos() }}</div>
          <div class="stat-lbl">Activos</div>
        </div>
        <div class="stat-card">
          <div class="stat-val" style="color:#a78bfa">{{ admins() }}</div>
          <div class="stat-lbl">Admins</div>
        </div>
      </div>

      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <ion-list class="usr-list">
          @for (u of usuarios(); track u._id) {
            <ion-item class="usr-item" button (click)="openModal(u)">
              <div class="usr-avatar" slot="start">{{ u.nombre.charAt(0).toUpperCase() }}</div>
              <ion-label>
                <h3>{{ u.nombre }}</h3>
                <p>{{ u.username }}</p>
              </ion-label>
              <div slot="end" class="usr-badges">
                <ion-badge [color]="u.activo ? 'success' : 'medium'">{{ u.activo ? 'Activo' : 'Inactivo' }}</ion-badge>
                <ion-badge color="tertiary" class="rol-badge">{{ u.rol }}</ion-badge>
              </div>
            </ion-item>
          }
          @if (usuarios().length === 0) {
            <div class="empty-msg">No hay usuarios</div>
          }
        </ion-list>
      }
    </ion-content>

    <!-- Modal -->
    <ion-modal [isOpen]="showModal()" (didDismiss)="showModal.set(false)">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button (click)="showModal.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
            <ion-title>{{ editando() ? 'Editar' : 'Nuevo' }} Usuario</ion-title>
            <ion-buttons slot="end">
              <ion-button [disabled]="saving()" (click)="guardar()" color="primary">
                @if (saving()) { <ion-spinner name="crescent" style="width:20px;height:20px"></ion-spinner> }
                @else { Guardar }
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          @if (error()) { <div class="error-banner">{{ error() }}</div> }
          <div class="modal-form">
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Nombre completo *</ion-label>
              <ion-input [(ngModel)]="form.nombre" placeholder="Nombre"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Usuario *</ion-label>
              <ion-input [(ngModel)]="form.username" placeholder="nombre_usuario" [readonly]="!!editando()"></ion-input>
            </ion-item>
            @if (!editando()) {
              <ion-item class="f-item" lines="none">
                <ion-label position="stacked">Contraseña *</ion-label>
                <ion-input [(ngModel)]="form.password" type="password" placeholder="••••••"></ion-input>
              </ion-item>
            }
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Rol</ion-label>
              <ion-select [(ngModel)]="form.rol" interface="action-sheet">
                <ion-select-option value="admin">Admin</ion-select-option>
                <ion-select-option value="operador">Operador</ion-select-option>
                <ion-select-option value="soporte">Soporte</ion-select-option>
              </ion-select>
            </ion-item>
            @if (editando()) {
              <ion-item class="f-item" lines="none">
                <ion-label position="stacked">Nueva contraseña (dejar vacío para no cambiar)</ion-label>
                <ion-input [(ngModel)]="form.newPassword" type="password" placeholder="••••••"></ion-input>
              </ion-item>
            }
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .stats-row { display:flex; gap:10px; padding:14px 16px 6px; }
    .stat-card { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:12px; text-align:center; }
    .stat-val { font-size:22px; font-weight:900; letter-spacing:-0.02em; color:#f1f5f9; }
    .stat-lbl { font-size:11px; color:rgba(241,245,249,0.4); margin-top:2px; }
    .loading-c { display:flex; justify-content:center; padding:60px 0; }
    .usr-list { padding:6px 16px 80px; }
    .usr-item { --border-radius:12px; margin-bottom:8px; --background:rgba(255,255,255,0.04); --border-color:transparent; }
    .usr-avatar { width:40px; height:40px; border-radius:11px; background:linear-gradient(135deg,#7c3aed,#c026d3); display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:800; color:#fff; flex-shrink:0; }
    ion-label h3 { font-size:14px; font-weight:700; color:#f1f5f9; }
    ion-label p { font-size:12px; color:rgba(241,245,249,0.4); margin-top:2px; }
    .usr-badges { display:flex; flex-direction:column; align-items:flex-end; gap:3px; }
    .rol-badge { font-size:10px; text-transform:capitalize; }
    .empty-msg { text-align:center; color:rgba(241,245,249,0.3); padding:60px 0; font-size:14px; }
    .error-banner { background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.25); color:#f43f5e; border-radius:10px; padding:10px 14px; font-size:13px; margin:12px 16px 0; }
    .modal-form { padding:16px; display:flex; flex-direction:column; gap:8px; }
    .f-item { --background:rgba(255,255,255,0.05); --border-radius:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; }
  `],
})
export class UsuariosPage implements OnInit {
  loading = signal(true);
  usuarios = signal<Usuario[]>([]);
  showModal = signal(false);
  editando = signal<Usuario | null>(null);
  saving = signal(false);
  error = signal('');
  form: Partial<Usuario & { password?: string; newPassword?: string }> = {};

  total = () => this.usuarios().length;
  activos = () => this.usuarios().filter(u => u.activo).length;
  admins = () => this.usuarios().filter(u => u.rol === 'admin').length;

  constructor(
    private usuariosApi: UsuariosApiService,
    public navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, closeOutline, pencilOutline, trashOutline, chevronBackOutline, personOutline, keyOutline });
  }

  ngOnInit() { this.load(); }
  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  async load() {
    this.loading.set(true);
    await new Promise<void>(res => this.usuariosApi.getAll().subscribe(u => { this.usuarios.set(u); res(); }));
    this.loading.set(false);
  }

  openModal(u?: Usuario) {
    this.editando.set(u || null);
    this.form = u ? { nombre: u.nombre, username: u.username, rol: u.rol } : { rol: 'operador' };
    this.error.set('');
    this.showModal.set(true);
  }

  async guardar() {
    if (!this.form.nombre || !this.form.username) {
      this.error.set('Nombre y usuario son obligatorios');
      return;
    }
    if (!this.editando() && !this.form.password) {
      this.error.set('La contraseña es obligatoria');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const payload: any = { ...this.form };
      if (this.form.newPassword) payload.password = this.form.newPassword;
      delete payload.newPassword;
      if (this.editando()) {
        await new Promise<void>((res, rej) => this.usuariosApi.update(this.editando()!._id, payload).subscribe({ next: () => res(), error: rej }));
      } else {
        await new Promise<void>((res, rej) => this.usuariosApi.create(payload).subscribe({ next: () => res(), error: rej }));
      }
      this.showModal.set(false);
      await this.load();
      const t = await this.toastCtrl.create({ message: 'Guardado', duration: 2000, color: 'success' });
      t.present();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'Error al guardar');
    } finally { this.saving.set(false); }
  }
}
