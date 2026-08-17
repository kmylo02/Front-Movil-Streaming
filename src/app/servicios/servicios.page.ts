import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonModal, IonItem, IonLabel, IonInput,
  IonToggle, IonSpinner, IonBadge, NavController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, pencilOutline, chevronBackOutline } from 'ionicons/icons';
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
            <div class="svc-card" [class.svc-inactiva]="!s.activo"
                 [style.--svc-c]="s.color" [style.--svc-glow]="s.color + '40'"
                 (click)="openModal(s)">
              <div class="svc-top">
                <div class="icono-stage">
                  <div class="icono-badge" [style.background]="'linear-gradient(150deg,' + s.color + 'f2,' + s.color + '99)'">
                    <span class="icono-glass"></span>
                    <span class="icono-text">{{ s.icono }}</span>
                  </div>
                  <div class="icono-shadow" [style.background]="s.color"></div>
                </div>
                <ion-badge [color]="s.activo ? 'success' : 'medium'" class="svc-badge">
                  {{ s.activo ? 'Activo' : 'Inactivo' }}
                </ion-badge>
              </div>
              <div class="svc-name">{{ s.nombre }}</div>
              <div class="svc-flags">
                @if (s.requiereNumeroPerfil) { <div class="svc-flag">N° perfil</div> }
                @if (s.requiereClavePerfil) { <div class="svc-flag">PIN</div> }
              </div>
              <button class="del-btn" [class.del-btn-on]="s.activo" (click)="$event.stopPropagation(); toggleActivo(s)"
                      [title]="s.activo ? 'Desactivar' : 'Activar'">
                {{ s.activo ? '✓' : '○' }}
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
            <div class="preview-card" [style.--svc-c]="form.color" [style.--svc-glow]="(form.color || '#7c3aed') + '40'">
              <div class="icono-stage preview-stage">
                <div class="icono-badge" [style.background]="'linear-gradient(150deg,' + (form.color || '#7c3aed') + 'f2,' + (form.color || '#7c3aed') + '99)'">
                  <span class="icono-glass"></span>
                  <span class="icono-text">{{ form.icono }}</span>
                </div>
              </div>
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
    .svcs-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; padding:14px 16px 80px; }
    .svc-card {
      position: relative;
      border-radius: 18px;
      background:
        radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--svc-c, #7c3aed) 10%, transparent), transparent 60%),
        linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
      border: 1px solid rgba(255,255,255,0.08);
      padding: 16px;
      box-shadow:
        0 1px 0 rgba(255,255,255,0.06) inset,
        0 14px 26px -16px rgba(0,0,0,0.7),
        0 2px 8px -2px rgba(0,0,0,0.4);
      transition: transform 0.15s ease-out, box-shadow 0.2s ease;
    }
    .svc-card:active {
      transform: scale(0.97) translateY(1px);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.06) inset,
        0 6px 14px -10px rgba(0,0,0,0.7),
        0 0 0 1px color-mix(in srgb, var(--svc-c, #7c3aed) 35%, transparent),
        0 10px 22px -12px var(--svc-glow, transparent);
    }
    .svc-inactiva { opacity: 0.45; filter: saturate(0.6); }
    .svc-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; }
    .svc-badge { font-size:10px; }
    .svc-name { font-size:14px; font-weight:700; color:#f1f5f9; margin-bottom:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .svc-flags { display:flex; flex-wrap:wrap; gap:4px; }
    .svc-flag { font-size:9px; padding:2px 6px; border-radius:4px; background:rgba(124,58,237,0.12); color:#a78bfa; border:1px solid rgba(124,58,237,0.2); }
    .del-btn {
      position:absolute; top:12px; right:12px; width:22px; height:22px; border-radius:50%;
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); padding:0;
      color:rgba(241,245,249,0.4); display:flex; align-items:center; justify-content:center; font-size:12px;
    }
    .del-btn-on { background:rgba(16,185,129,0.15); border-color:rgba(16,185,129,0.4); color:#10b981; }

    /* Icono flotante estilo "app icon" con relieve */
    .icono-stage { position: relative; }
    .icono-badge {
      width: 44px; height: 44px; border-radius: 13px; position: relative; overflow: hidden;
      display: flex; align-items: center; justify-content: center;
      box-shadow:
        inset 0 1px 1px rgba(255,255,255,0.55),
        inset 0 -8px 12px rgba(0,0,0,0.28),
        0 6px 14px -4px rgba(0,0,0,0.5);
    }
    .icono-glass {
      position: absolute; top: 0; left: 0; right: 0; height: 55%;
      background: linear-gradient(180deg, rgba(255,255,255,0.35), rgba(255,255,255,0));
      border-radius: 13px 13px 60% 60% / 13px 13px 26px 26px;
    }
    .icono-text { position: relative; font-size: 18px; }
    .icono-shadow {
      position: absolute; left: 6px; right: 6px; bottom: -10px; height: 10px; border-radius: 50%;
      filter: blur(8px); opacity: 0.4;
    }

    .modal-form { padding:16px; display:flex; flex-direction:column; gap:8px; }
    .preview-card {
      border-radius: 18px; padding: 20px; text-align: center; margin-bottom: 6px;
      background:
        radial-gradient(120% 100% at 50% 0%, color-mix(in srgb, var(--svc-c, #7c3aed) 14%, transparent), transparent 65%),
        linear-gradient(160deg, rgba(255,255,255,0.05), rgba(255,255,255,0.015));
      border: 1px solid color-mix(in srgb, var(--svc-c, #7c3aed) 40%, rgba(255,255,255,0.1));
      box-shadow: 0 16px 30px -18px var(--svc-glow, transparent), 0 1px 0 rgba(255,255,255,0.06) inset;
    }
    .preview-stage { display: flex; justify-content: center; margin-bottom: 10px; }
    .preview-stage .icono-badge { width: 56px; height: 56px; border-radius: 16px; }
    .preview-stage .icono-text { font-size: 24px; }
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
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, closeOutline, pencilOutline, chevronBackOutline });
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
      const t = await this.toastCtrl.create({ message: this.editando() ? 'Plataforma actualizada ✅' : 'Plataforma agregada ✅', duration: 2000, color: 'success' });
      t.present();
    } catch (e: any) {
      const t = await this.toastCtrl.create({ message: e?.error?.message || 'No pudimos guardar la plataforma. Inténtalo de nuevo.', duration: 3000, color: 'danger' });
      t.present();
    } finally { this.saving.set(false); }
  }

  async toggleActivo(s: Servicio) {
    try {
      await new Promise<void>((res, rej) => this.serviciosApi.update(s._id, { activo: !s.activo }).subscribe({ next: () => res(), error: rej }));
      await this.load();
    } catch (e: any) {
      const t = await this.toastCtrl.create({ message: e?.error?.message || 'No pudimos cambiar el estado de la plataforma', duration: 3000, color: 'danger' });
      t.present();
    }
  }
}
