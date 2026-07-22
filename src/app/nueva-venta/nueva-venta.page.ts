import { Component, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonNote, IonChip,
  IonSpinner, NavController, LoadingController, ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, checkmarkOutline, addOutline, closeOutline, searchOutline } from 'ionicons/icons';
import {
  VentasApiService, ClientesApiService, ServiciosApiService, InventarioApiService,
  Cliente, Servicio,
} from '../core/services/api.service';
import { VentaEventsService } from '../core/services/venta-events.service';

interface CuentaDisponible {
  cuentaId: string;
  email: string;
  clave: string;
  tipo: string;
  perfilesDisponibles: { numero: number; clavePerfil?: string }[];
}

interface ServicioForm {
  servicio: Servicio;
  seleccionado: boolean;
  cuentaId: string;
  emailCuenta: string;
  claveCuenta: string;
  numeroPerfil: number | null;
  clavePerfil: string;
  perfilesDisponibles: { numero: number; clavePerfil?: string }[];
  cuentasDisponibles: CuentaDisponible[];
}

@Component({
  selector: 'app-nueva-venta',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonItem, IonLabel, IonInput, IonSelect, IonSelectOption, IonNote, IonChip, IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="navCtrl.back()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Nueva Venta</ion-title>
        <ion-buttons slot="end">
          <ion-button [disabled]="!canSave() || saving()" (click)="guardar()" color="primary">
            @if (saving()) { <ion-spinner name="crescent" style="width:20px;height:20px"></ion-spinner> }
            @else { Guardar }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="form-body">

        <!-- Step 1: Cliente -->
        <div class="step-card">
          <div class="step-header"><span class="step-num">1</span><span class="step-title">Cliente</span></div>
          <ion-item class="f-item" lines="none">
            <ion-input
              [(ngModel)]="clienteBusqueda"
              placeholder="Buscar cliente por nombre…"
              (ngModelChange)="buscarClientes($event)">
            </ion-input>
          </ion-item>
          @if (clienteSeleccionado()) {
            <ion-chip class="sel-chip" (click)="clienteSeleccionado.set(null); clienteBusqueda = ''">
              {{ clienteSeleccionado()!.nombre }} ✕
            </ion-chip>
          }
          @if (clientesBusqueda().length > 0 && !clienteSeleccionado()) {
            <div class="sugg-list">
              @for (c of clientesBusqueda(); track c._id) {
                <div class="sugg-item" (click)="seleccionarCliente(c)">
                  <div class="sugg-name">{{ c.nombre }}</div>
                  <div class="sugg-tel">{{ c.telefono }}</div>
                </div>
              }
            </div>
          }
        </div>

        <!-- Step 2: Duración -->
        <div class="step-card">
          <div class="step-header"><span class="step-num">2</span><span class="step-title">Período</span></div>
          <div class="dur-grid">
            @for (d of duraciones; track d.meses) {
              <button class="dur-btn" [class.dur-active]="duracionMeses === d.meses" (click)="setDuracion(d.meses)">
                {{ d.label }}
              </button>
            }
          </div>
          <div class="date-row">
            <div class="date-box">
              <div class="date-lbl">Inicio</div>
              <input class="date-input" type="date" [(ngModel)]="fechaInicio" (ngModelChange)="calcFechaVenc()">
            </div>
            <div class="date-box">
              <div class="date-lbl">Vencimiento</div>
              <div class="date-val">{{ fechaVencimiento || '—' }}</div>
            </div>
          </div>
        </div>

        <!-- Step 3: Servicios -->
        <div class="step-card">
          <div class="step-header"><span class="step-num">3</span><span class="step-title">Servicios</span></div>
          @if (loadingSvcs()) {
            <ion-spinner name="crescent" style="margin:12px auto;display:block"></ion-spinner>
          } @else {
            <div class="svc-toggles">
              @for (sf of serviciosForm(); track sf.servicio._id) {
                <button class="svc-toggle" [class.svc-active]="sf.seleccionado"
                  [style.--srv-color]="sf.servicio.color"
                  (click)="toggleServicio(sf)">
                  <span class="svc-icon">{{ sf.servicio.icono }}</span>
                  <span>{{ sf.servicio.nombre }}</span>
                </button>
              }
            </div>
            @for (sf of serviciosForm(); track sf.servicio._id) {
              @if (sf.seleccionado) {
                <div class="cred-block">
                  <div class="cred-title">{{ sf.servicio.nombre }}</div>
                  <ion-item class="f-item" lines="none">
                    <ion-input [(ngModel)]="sf.emailCuenta" placeholder="Email cuenta" type="email" (ngModelChange)="buscarCuentas(sf)"></ion-input>
                  </ion-item>
                  <ion-item class="f-item" lines="none">
                    <ion-input [(ngModel)]="sf.claveCuenta" placeholder="Clave cuenta" type="password"></ion-input>
                  </ion-item>
                  @if (sf.servicio.requiereNumeroPerfil) {
                    <ion-item class="f-item" lines="none">
                      <ion-select [(ngModel)]="sf.numeroPerfil" placeholder="N° perfil" interface="popover">
                        @for (p of sf.perfilesDisponibles; track p.numero) {
                          <ion-select-option [value]="p.numero">Perfil {{ p.numero }}</ion-select-option>
                        }
                      </ion-select>
                    </ion-item>
                  }
                  @if (sf.servicio.requiereClavePerfil) {
                    <ion-item class="f-item" lines="none">
                      <ion-input [(ngModel)]="sf.clavePerfil" placeholder="PIN perfil"></ion-input>
                    </ion-item>
                  }
                  @if (sf.cuentasDisponibles.length > 0) {
                    <div class="cuentas-sugg">
                      <div class="sugg-lbl">Cuentas disponibles:</div>
                      @for (c of sf.cuentasDisponibles; track c.cuentaId) {
                        <div class="cuenta-sugg-item" (click)="seleccionarCuenta(sf, c)">
                          {{ c.email }} ({{ c.perfilesDisponibles.length }} libres)
                        </div>
                      }
                    </div>
                  }
                </div>
              }
            }
          }
        </div>

        <!-- Step 4: Monto -->
        <div class="step-card">
          <div class="step-header"><span class="step-num">4</span><span class="step-title">Monto</span></div>
          <ion-item class="f-item" lines="none">
            <ion-input [(ngModel)]="monto" placeholder="Monto en pesos" type="number" min="0"></ion-input>
          </ion-item>
          <ion-item class="f-item" lines="none">
            <ion-input [(ngModel)]="notas" placeholder="Notas (opcional)"></ion-input>
          </ion-item>
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    .form-body { padding: 12px 16px 80px; display: flex; flex-direction: column; gap: 14px; }
    .step-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px; }
    .step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .step-num { width: 24px; height: 24px; border-radius: 50%; background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.4); color: #a78bfa; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .step-title { font-size: 14px; font-weight: 700; color: #f1f5f9; }
    .f-item { --background: rgba(255,255,255,0.05); --border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; margin-bottom: 8px; }
    .sugg-list { border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; margin-top: 4px; }
    .sugg-item { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .sugg-item:last-child { border-bottom: none; }
    .sugg-name { font-size: 14px; font-weight: 600; color: #f1f5f9; }
    .sugg-tel { font-size: 11px; color: rgba(241,245,249,0.4); }
    .sel-chip { --background: rgba(124,58,237,0.15); --color: #a78bfa; margin-top: 4px; }
    .dur-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin-bottom: 12px; }
    .dur-btn { border-radius: 9px; padding: 8px 4px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(241,245,249,0.6); }
    .dur-active { background: rgba(124,58,237,0.2); border-color: rgba(124,58,237,0.4); color: #a78bfa; }
    .date-row { display: flex; gap: 10px; }
    .date-box { flex: 1; background: rgba(255,255,255,0.05); border-radius: 9px; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.08); }
    .date-lbl { font-size: 10px; color: rgba(241,245,249,0.4); margin-bottom: 4px; }
    .date-input { background: transparent; border: none; color: #f1f5f9; font-size: 13px; width: 100%; }
    .date-val { font-size: 13px; color: #a78bfa; font-weight: 600; }
    .svc-toggles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .svc-toggle { border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(241,245,249,0.6); display: flex; align-items: center; gap: 6px; }
    .svc-active { background: rgba(var(--srv-color-rgb, 124,58,237), 0.15); border-color: var(--srv-color, rgba(124,58,237,0.4)); color: var(--srv-color, #a78bfa); }
    .cred-block { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 12px; margin-top: 8px; }
    .cred-title { font-size: 12px; font-weight: 700; color: rgba(241,245,249,0.5); margin-bottom: 8px; letter-spacing: 0.04em; text-transform: uppercase; }
    .cuentas-sugg { margin-top: 6px; }
    .sugg-lbl { font-size: 11px; color: rgba(241,245,249,0.3); margin-bottom: 4px; }
    .cuenta-sugg-item { font-size: 12px; color: #a78bfa; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
  `],
})
export class NuevaVentaPage implements OnInit {
  clienteBusqueda = '';
  clientesBusqueda = signal<Cliente[]>([]);
  clienteSeleccionado = signal<Cliente | null>(null);

  duracionMeses = 1;
  fechaInicio = new Date().toISOString().split('T')[0];
  fechaVencimiento = '';

  serviciosForm = signal<ServicioForm[]>([]);
  loadingSvcs = signal(true);

  monto: number | null = null;
  notas = '';
  saving = signal(false);

  duraciones = [
    { meses: 1, label: '1 mes' },
    { meses: 3, label: '3 meses' },
    { meses: 6, label: '6 meses' },
    { meses: 12, label: '1 año' },
  ];

  constructor(
    private ventasApi: VentasApiService,
    private clientesApi: ClientesApiService,
    private serviciosApi: ServiciosApiService,
    private inventarioApi: InventarioApiService,
    private ventaEvents: VentaEventsService,
    public navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ chevronBackOutline, checkmarkOutline, addOutline, closeOutline, searchOutline });
  }

  ngOnInit() {
    this.calcFechaVenc();
    this.serviciosApi.getAll().subscribe(svcs => {
      this.serviciosForm.set(svcs.filter(s => s.activo).map(s => ({
        servicio: s, seleccionado: false, cuentaId: '',
        emailCuenta: '', claveCuenta: '', numeroPerfil: null, clavePerfil: '',
        perfilesDisponibles: [], cuentasDisponibles: [],
      })));
      this.loadingSvcs.set(false);
    });
  }

  buscarClientes(q: string) {
    if (q.length < 2) { this.clientesBusqueda.set([]); return; }
    this.clientesApi.getAll(q).subscribe(cs => this.clientesBusqueda.set(cs.slice(0, 6)));
  }

  seleccionarCliente(c: Cliente) {
    this.clienteSeleccionado.set(c);
    this.clienteBusqueda = c.nombre;
    this.clientesBusqueda.set([]);
  }

  setDuracion(m: number) { this.duracionMeses = m; this.calcFechaVenc(); }

  calcFechaVenc() {
    if (!this.fechaInicio) return;
    const d = new Date(this.fechaInicio + 'T00:00:00');
    d.setMonth(d.getMonth() + this.duracionMeses);
    this.fechaVencimiento = d.toISOString().split('T')[0];
  }

  toggleServicio(sf: ServicioForm) {
    sf.seleccionado = !sf.seleccionado;
    if (sf.seleccionado) {
      this.inventarioApi.getDisponibles(sf.servicio.nombre).subscribe(cs => {
        sf.cuentasDisponibles = cs;
      });
    } else {
      sf.cuentaId = '';
      sf.perfilesDisponibles = [];
      sf.numeroPerfil = null;
    }
    this.serviciosForm.update(f => [...f]);
  }

  buscarCuentas(sf: ServicioForm) {
    this.inventarioApi.getDisponibles(sf.servicio.nombre).subscribe(cs => {
      sf.cuentasDisponibles = sf.emailCuenta
        ? cs.filter((c: CuentaDisponible) => c.email.toLowerCase().includes(sf.emailCuenta.toLowerCase()))
        : cs;
      this.serviciosForm.update(f => [...f]);
    });
  }

  seleccionarCuenta(sf: ServicioForm, c: CuentaDisponible) {
    sf.cuentaId = c.cuentaId;
    sf.emailCuenta = c.email;
    sf.claveCuenta = c.clave;
    sf.perfilesDisponibles = c.perfilesDisponibles || [];
    const primero = sf.perfilesDisponibles[0];
    sf.numeroPerfil = primero?.numero ?? null;
    sf.clavePerfil = primero?.clavePerfil || '';
    sf.cuentasDisponibles = [];
    this.serviciosForm.update(f => [...f]);
  }

  canSave(): boolean {
    const seleccionados = this.serviciosForm().filter(sf => sf.seleccionado);
    return !!this.clienteSeleccionado() &&
      !!this.fechaInicio && !!this.fechaVencimiento &&
      seleccionados.length > 0 &&
      seleccionados.every(sf => !!sf.cuentaId && (sf.numeroPerfil != null || !sf.servicio.requiereNumeroPerfil)) &&
      !!this.monto;
  }

  async guardar() {
    if (!this.canSave()) return;
    const loading = await this.loadingCtrl.create({ message: 'Guardando…' });
    await loading.present();
    this.saving.set(true);
    try {
      const cliente = this.clienteSeleccionado()!;
      const serviciosSeleccionados = this.serviciosForm()
        .filter(sf => sf.seleccionado)
        .map(sf => ({
          cuentaId: sf.cuentaId,
          numeroPerfil: sf.numeroPerfil ?? 1,
          clavePerfil: sf.clavePerfil || undefined,
        }));
      await new Promise<void>((res, rej) => this.ventasApi.create({
        clienteId: cliente._id,
        nombreCliente: cliente.nombre,
        serviciosSeleccionados,
        fechaInicio: this.fechaInicio,
        fechaVencimiento: this.fechaVencimiento,
        duracionMeses: this.duracionMeses,
        monto: this.monto,
        notas: this.notas,
      }).subscribe({ next: () => res(), error: rej }));
      this.ventaEvents.notificar();
      const t = await this.toastCtrl.create({ message: 'Venta creada', duration: 2000, color: 'success' });
      await t.present();
      this.navCtrl.back();
    } catch (e: any) {
      const t = await this.toastCtrl.create({ message: e?.error?.message || 'Error al guardar', duration: 3000, color: 'danger' });
      await t.present();
    } finally {
      loading.dismiss();
      this.saving.set(false);
    }
  }
}
