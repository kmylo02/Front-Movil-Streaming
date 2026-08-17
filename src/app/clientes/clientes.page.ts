import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonSearchbar, IonList, IonItem, IonLabel,
  IonModal, IonInput, IonSpinner, IonBadge, IonActionSheet, NavController,
  AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline, pencilOutline, trashOutline, closeOutline, filmOutline,
  logoWhatsapp, callOutline, checkmarkOutline,
} from 'ionicons/icons';
import { ClientesApiService, Cliente } from '../core/services/api.service';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonSearchbar, IonList, IonItem, IonLabel,
    IonModal, IonInput, IonSpinner, IonBadge, IonActionSheet,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Clientes</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openModal()"><ion-icon name="add-outline" slot="icon-only"></ion-icon></ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="doRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <ion-searchbar [(ngModel)]="busqueda" placeholder="Buscar…" (ionInput)="buscar()" debounce="400"></ion-searchbar>

      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <ion-list class="clientes-list">
          @for (c of clientes(); track c._id) {
            <ion-item class="cliente-item" button (click)="openActions(c)">
              <div class="c-avatar" slot="start">{{ c.nombre.charAt(0).toUpperCase() }}</div>
              <ion-label>
                <h3>{{ c.nombre }}</h3>
                <p>{{ c.telefono }}</p>
              </ion-label>
              <ion-badge slot="end" [color]="c.activo ? 'success' : 'medium'">
                {{ c.activo ? 'Activo' : 'Inactivo' }}
              </ion-badge>
            </ion-item>
          }
          @if (clientes().length === 0) {
            <div class="empty-msg">No hay clientes</div>
          }
        </ion-list>
      }
    </ion-content>

    <!-- Action Sheet -->
    @if (seleccionado()) {
      <ion-action-sheet
        [isOpen]="showActions()"
        [header]="seleccionado()!.nombre"
        [buttons]="actionButtons()"
        (didDismiss)="showActions.set(false)">
      </ion-action-sheet>
    }

    <!-- Create / Edit Modal -->
    <ion-modal [isOpen]="showModal()" (didDismiss)="showModal.set(false)">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button (click)="showModal.set(false)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
            <ion-title>{{ editando() ? 'Editar' : 'Nuevo' }} Cliente</ion-title>
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
              <ion-label position="stacked">Nombre *</ion-label>
              <ion-input [(ngModel)]="form.nombre" placeholder="Nombre completo"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Teléfono *</ion-label>
              <ion-input [(ngModel)]="form.telefono" type="tel" placeholder="+57 300 000 0000"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">WhatsApp</ion-label>
              <ion-input [(ngModel)]="form.whatsapp" type="tel" placeholder="Número WhatsApp"></ion-input>
            </ion-item>
          </div>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [`
    .loading-c { display:flex; justify-content:center; padding:60px 0; }
    .clientes-list { padding: 8px 16px 80px; }
    .cliente-item { --border-radius: 12px; margin-bottom: 8px; --background: rgba(255,255,255,0.04); --border-color: transparent; }
    .c-avatar {
      width: 40px; height: 40px; border-radius: 11px;
      background: linear-gradient(135deg, #7c3aed, #a855f7);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 800; color: #fff; flex-shrink: 0;
    }
    ion-label h3 { font-size: 14px; font-weight: 700; color: #f1f5f9; }
    ion-label p { font-size: 12px; color: rgba(241,245,249,0.4); margin-top: 2px; }
    .empty-msg { text-align:center; color:rgba(241,245,249,0.3); padding:60px 0; font-size:14px; }
    .error-banner { background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.25); color:#f43f5e; border-radius:10px; padding:10px 14px; font-size:13px; margin:12px 16px 0; }
    .modal-form { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .f-item { --background: rgba(255,255,255,0.05); --border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; }
  `],
})
export class ClientesPage implements OnInit {
  loading = signal(true);
  clientes = signal<Cliente[]>([]);
  busqueda = '';
  showModal = signal(false);
  editando = signal<Cliente | null>(null);
  saving = signal(false);
  error = signal('');
  seleccionado = signal<Cliente | null>(null);
  showActions = signal(false);

  form: Partial<Cliente> = {};

  actionButtons = () => {
    const c = this.seleccionado();
    if (!c) return [];
    const btns: any[] = [
      { text: 'Editar', icon: 'pencil-outline', handler: () => this.openModal(c) },
      { text: 'Ver ventas', icon: 'film-outline', handler: () =>
        this.navCtrl.navigateForward('/tabs/ventas', { queryParams: { clienteId: c._id, nombre: c.nombre } }) },
      { text: 'Nueva venta', icon: 'add-outline', handler: () =>
        this.navCtrl.navigateForward('/tabs/ventas/nueva', { queryParams: { clienteId: c._id, nombre: c.nombre } }) },
    ];
    if (c.whatsapp) {
      btns.push({ text: 'Abrir WhatsApp', icon: 'logo-whatsapp', handler: () => this.abrirWhatsapp(c) });
    }
    btns.push({ text: 'Cerrar', role: 'cancel' });
    return btns;
  };

  constructor(
    private clientesApi: ClientesApiService,
    public navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ addOutline, pencilOutline, trashOutline, closeOutline, filmOutline, logoWhatsapp, callOutline, checkmarkOutline });
  }

  ngOnInit() { this.load(); }

  async doRefresh(ev: any) { await this.load(); ev.target.complete(); }

  async load(q?: string) {
    this.loading.set(true);
    await new Promise<void>(res => this.clientesApi.getAll(q).subscribe(cs => { this.clientes.set(cs); res(); }));
    this.loading.set(false);
  }

  buscar() { this.load(this.busqueda || undefined); }

  openModal(c?: Cliente) {
    this.editando.set(c || null);
    this.form = c ? { ...c } : {};
    this.error.set('');
    this.showModal.set(true);
  }

  openActions(c: Cliente) {
    this.seleccionado.set(c);
    this.showActions.set(true);
  }

  abrirWhatsapp(c: Cliente) {
    const num = (c.whatsapp || '').replace(/\D/g, '');
    if (num) window.open(`https://wa.me/${num}`, '_blank');
  }

  async guardar() {
    if (!this.form.nombre || !this.form.telefono) {
      this.error.set('Nombre y teléfono son obligatorios');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      if (this.editando()) {
        await new Promise<void>((res, rej) => this.clientesApi.update(this.editando()!._id, this.form).subscribe({ next: () => res(), error: rej }));
      } else {
        await new Promise<void>((res, rej) => this.clientesApi.create(this.form).subscribe({ next: () => res(), error: rej }));
      }
      this.showModal.set(false);
      await this.load();
      const t = await this.toastCtrl.create({ message: this.editando() ? 'Cliente actualizado ✅' : 'Cliente agregado ✅', duration: 2000, color: 'success' });
      t.present();
    } catch (e: any) {
      this.error.set(e?.error?.message || 'No pudimos guardar el cliente. Inténtalo de nuevo.');
    } finally { this.saving.set(false); }
  }
}
