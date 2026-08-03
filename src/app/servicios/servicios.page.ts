import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonModal, IonItem, IonLabel, IonInput,
  IonToggle, IonSpinner, IonBadge, NavController, AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, pencilOutline, trashOutline, chevronBackOutline } from 'ionicons/icons';
import { ServiciosApiService, Servicio } from '../core/services/api.service';

const COLORS = ['#7c3aed','#c026d3','#f43f5e','#f59e0b','#10b981','#0ea5e9','#ec4899','#14b8a6'];
const ICONOS = ['📺','🎬','🎵','🎮','⚡','🏆','🌐','📡','🔴','🎯'];

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonModal, IonItem, IonLabel, IonInput,
    IonToggle, IonSpinner, IonBadge,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="navCtrl.back()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Plataformas</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openModal()"><ion-icon name="add-outline" slot="icon-only"></ion-icon></ion-button>
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
        <div class="svcs-grid">
          @for (s of servicios(); track s._id) {
            <div class="svc-card" [style.--svc-c]="s.color" (click)="openModal(s)">
              <div class="svc-top">
                <div class="svc-icon-wrap">{{ s.icono }}</div>
                <ion-badge [color]="s.activo ? 'success' : 'medium'" class="svc-badge">
                  {{ s.activo ? 'Activo' : 'Inactivo' }}
                </ion-badge>
              </div>
              <div class="svc-name">{{ s.nombre }}</div>
              @if (s.precio) {
                <div class="svc-price">{{ '$' + s.precio.toLocaleString() }}</div>
              }
              <div class="svc-flags">
                @if (s.requiereNumeroPerfil) { <div class="svc-flag">N° perfil</div> }
                @if (s.requiereClavePerfil) { <div class="svc-flag">PIN</div> }
              </div>
              <button class="del-btn" (click)="$event.stopPropagation(); eliminar(s)">
                <ion-icon name="trash-outline"></ion-icon>
              </button>
            </div>
          }
        </div>
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
            <ion-title>{{ editando() ? 'Editar' : 'Nueva' }} Plataforma</ion-title>
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
            <!-- Preview -->
            <div class="preview-card" [style.border-color]="form.color">
              <div class="preview-icon">{{ form.icono }}</div>
              <div class="preview-name">{{ form.nombre || 'Nombre plataforma' }}</div>
            </div>

            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Nombre *</ion-label>
              <ion-input [(ngModel)]="form.nombre" placeholder="Ej: Netflix"></ion-input>
            </ion-item>

            <div class="picker-label">Color</div>
            <div class="color-picker">
              @for (c of colors; track c) {
                <button class="color-swatch" [style.background]="c"
                  [class.swatch-active]="form.color === c" (click)="form.color = c">
                  @if (form.color === c) { <span style="color:#fff;font-size:12px">✓</span> }
                </button>
              }
            </div>

            <div class="picker-label">Ícono</div>
            <div class="icon-picker">
              @for (i of iconos; track i) {
                <button class="icon-btn" [class.icon-active]="form.icono === i" (click)="form.icono = i">{{ i }}</button>
              }
            </div>

            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Precio mensual ($)</ion-label>
              <ion-input [(ngModel)]="form.precio" type="number" placeholder="0"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Perfiles por cuenta</ion-label>
              <ion-input [(ngModel)]="form.perfilesPorCuenta" type="number" placeholder="4"></ion-input>
            </ion-item>

            <ion-item class="f-item" lines="none">
              <ion-label>Requiere N° de perfil</ion-label>
              <ion-toggle [(ngModel)]="form.requiereNumeroPerfil" slot="end"></ion-toggle>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label>Requiere clave de perfil</ion-label>
              <ion-toggle [(ngModel)]="form.requiereClavePerfil" slot="end"></ion-toggle>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label>Activo</ion-label>
              <ion-toggle [(ngModel)]="form.activo" slot="end"></ion-toggle>
            </ion-item>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .loading-c { display:flex; justify-content:center; padding:60px 0; }
    .svcs-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px 16px 80px; }
    .svc-card {
      background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07);
      border-radius:14px; padding:14px; position:relative;
      border-left:3px solid var(--svc-c, #7c3aed);
    }
    .svc-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .svc-icon-wrap { font-size:20px; }
    .svc-badge { font-size:10px; }
    .svc-name { font-size:14px; font-weight:700; color:#f1f5f9; margin-bottom:3px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .svc-price { font-size:12px; color:rgba(241,245,249,0.4); margin-bottom:6px; }
    .svc-flags { display:flex; flex-wrap:wrap; gap:4px; }
    .svc-flag { font-size:9px; padding:2px 6px; border-radius:4px; background:rgba(124,58,237,0.12); color:#a78bfa; border:1px solid rgba(124,58,237,0.2); }
    .del-btn { position:absolute; top:10px; right:10px; background:transparent; border:none; padding:4px; color:rgba(244,63,94,0.5); display:flex; align-items:center; justify-content:center; }
    .modal-form { padding:16px; display:flex; flex-direction:column; gap:8px; }
    .preview-card { border:2px solid; border-radius:14px; padding:16px; text-align:center; margin-bottom:6px; }
    .preview-icon { font-size:32px; margin-bottom:6px; }
    .preview-name { font-size:16px; font-weight:700; color:#f1f5f9; }
    .picker-label { font-size:11px; font-weight:700; color:rgba(241,245,249,0.4); text-transform:uppercase; letter-spacing:0.05em; padding:4px 0 6px; }
    .color-picker { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px; }
    .color-swatch { width:28px; height:28px; border-radius:8px; border:2px solid transparent; display:flex; align-items:center; justify-content:center; }
    .swatch-active { border-color:#fff; }
    .icon-picker { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
    .icon-btn { font-size:20px; padding:4px 6px; border-radius:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); }
    .icon-active { background:rgba(124,58,237,0.2); border-color:rgba(124,58,237,0.4); }
    .f-item { --background:rgba(255,255,255,0.05); --border-radius:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; }
  `],
})
export class ServiciosPage implements OnInit {
  loading = signal(true);
  servicios = signal<Servicio[]>([]);
  showModal = signal(false);
  editando = signal<Servicio | null>(null);
  saving = signal(false);
  form: Partial<Servicio> = {};
  colors = COLORS;
  iconos = ICONOS;

  constructor(
    private serviciosApi: ServiciosApiService,
    public navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, closeOutline, pencilOutline, trashOutline, chevronBackOutline });
  }

  ngOnInit() { this.load(); }
  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  async load() {
    this.loading.set(true);
    await new Promise<void>(res => this.serviciosApi.getAll().subscribe(s => { this.servicios.set(s); res(); }));
    this.loading.set(false);
  }

  openModal(s?: Servicio) {
    this.editando.set(s || null);
    this.form = s ? { ...s } : { color: COLORS[0], icono: ICONOS[0], activo: true, requiereNumeroPerfil: true };
    this.showModal.set(true);
  }

  async guardar() {
    if (!this.form.nombre) return;
    this.saving.set(true);
    try {
      if (this.editando()) {
        await new Promise<void>((res, rej) => this.serviciosApi.update(this.editando()!._id, this.form).subscribe({ next: () => res(), error: rej }));
      } else {
        await new Promise<void>((res, rej) => this.serviciosApi.create(this.form).subscribe({ next: () => res(), error: rej }));
      }
      this.showModal.set(false);
      await this.load();
      const t = await this.toastCtrl.create({ message: 'Guardado', duration: 2000, color: 'success' });
      t.present();
    } catch (e: any) {
      const t = await this.toastCtrl.create({ message: e?.error?.message || 'Error al guardar', duration: 3000, color: 'danger' });
      t.present();
    } finally { this.saving.set(false); }
  }

  async eliminar(s: Servicio) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar plataforma',
      message: `¿Eliminar ${s.nombre}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: async () => {
          try {
            await new Promise<void>((res, rej) => this.serviciosApi.delete(s._id).subscribe({ next: () => res(), error: rej }));
            await this.load();
          } catch (e: any) {
            const t = await this.toastCtrl.create({ message: e?.error?.message || 'Error al eliminar', duration: 3000, color: 'danger' });
            t.present();
          }
        }},
      ],
    });
    await alert.present();
  }
}
