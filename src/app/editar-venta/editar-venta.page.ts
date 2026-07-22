import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonItem, IonInput, IonSelect, IonSelectOption, IonSpinner,
  NavController, LoadingController, ToastController, AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronBackOutline, closeOutline } from 'ionicons/icons';
import {
  VentasApiService, ClientesApiService, ServiciosApiService, InventarioApiService,
  Cliente, Servicio, Cuenta,
} from '../core/services/api.service';
import { VentaEventsService } from '../core/services/venta-events.service';

interface CuentaDisponible {
  cuentaId: string;
  email: string;
  clave: string;
  tipo: string;
  perfilesDisponibles: { numero: number; clavePerfil?: string }[];
}

interface ServicioEditForm {
  nombreServicio: string;
  cuentaId: string;
  emailCuenta: string;
  claveCuenta: string;
  numeroPerfil: number | null;
  clavePerfil: string;
  perfilesDisponibles: { numero: number; clavePerfil?: string }[];
  cuentasDisponibles: CuentaDisponible[];
}

@Component({
  selector: 'app-editar-venta',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonItem, IonInput, IonSelect, IonSelectOption, IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="navCtrl.back()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Editar Venta</ion-title>
        <ion-buttons slot="end">
          <ion-button [disabled]="!canSave() || saving() || loading()" (click)="guardar()" color="primary">
            @if (saving()) { <ion-spinner name="crescent" style="width:20px;height:20px"></ion-spinner> }
            @else { Guardar }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-c"><ion-spinner name="crescent"></ion-spinner></div>
      } @else {
        <div class="form-body">

          <!-- Cliente -->
          <div class="step-card">
            <div class="step-header"><span class="step-title">Cliente</span></div>
            <ion-item class="f-item" lines="none">
              <ion-input
                [(ngModel)]="clienteBusqueda"
                placeholder="Buscar y cambiar cliente…"
                (ngModelChange)="buscarClientes($event)">
              </ion-input>
            </ion-item>
            @if (clientesBusqueda().length > 0) {
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

          <!-- Duración -->
          <div class="step-card">
            <div class="step-header"><span class="step-title">Período</span></div>
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
                <input class="date-input" type="date" [(ngModel)]="fechaVencimiento">
              </div>
            </div>
          </div>

          <!-- Servicios -->
          <div class="step-card">
            <div class="step-header"><span class="step-title">Servicios</span></div>
            <div class="svc-toggles">
              @for (srv of todosServicios(); track srv._id) {
                <button class="svc-toggle" [class.svc-active]="isServicioSeleccionado(srv)"
                  [style.--srv-color]="srv.color"
                  (click)="toggleServicio(srv)">
                  <span class="svc-icon">{{ srv.icono }}</span>
                  <span>{{ srv.nombre }}</span>
                </button>
              }
            </div>

            @for (sf of serviciosForm(); track sf.nombreServicio) {
              <div class="cred-block">
                <div class="cred-title-row">
                  <div class="cred-title">{{ sf.nombreServicio }}</div>
                  <ion-icon name="close-outline" class="cred-remove" (click)="quitarServicio(sf.nombreServicio)"></ion-icon>
                </div>
                <ion-item class="f-item" lines="none">
                  <ion-input [(ngModel)]="sf.emailCuenta" placeholder="Email cuenta" type="email" (ngModelChange)="buscarCuentas(sf)"></ion-input>
                </ion-item>
                <ion-item class="f-item" lines="none">
                  <ion-input [(ngModel)]="sf.claveCuenta" placeholder="Clave cuenta" type="password"></ion-input>
                </ion-item>
                @if (getServicio(sf.nombreServicio)?.requiereNumeroPerfil !== false) {
                  <ion-item class="f-item" lines="none">
                    <ion-select [(ngModel)]="sf.numeroPerfil" placeholder="N° perfil" interface="popover">
                      @for (p of sf.perfilesDisponibles; track p.numero) {
                        <ion-select-option [value]="p.numero">Perfil {{ p.numero }}</ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                }
                @if (getServicio(sf.nombreServicio)?.requiereClavePerfil) {
                  <ion-item class="f-item" lines="none">
                    <ion-input [(ngModel)]="sf.clavePerfil" placeholder="PIN perfil (opcional)"></ion-input>
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
            @if (serviciosForm().length === 0) {
              <div class="empty-svc">Selecciona al menos una plataforma</div>
            }
          </div>

          <!-- Pago -->
          <div class="step-card">
            <div class="step-header"><span class="step-title">Pago</span></div>
            <ion-item class="f-item" lines="none">
              <ion-input [(ngModel)]="monto" placeholder="Monto en pesos" type="number" min="0"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-input [(ngModel)]="notas" placeholder="Notas (opcional)"></ion-input>
            </ion-item>
          </div>

        </div>
      }
    </ion-content>
  `,
  styles: [`
    .loading-c { display: flex; justify-content: center; padding: 60px 0; }
    .form-body { padding: 12px 16px 80px; display: flex; flex-direction: column; gap: 14px; }
    .step-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 14px; }
    .step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
    .step-title { font-size: 14px; font-weight: 700; color: #f1f5f9; }
    .f-item { --background: rgba(255,255,255,0.05); --border-radius: 9px; border: 1px solid rgba(255,255,255,0.08); border-radius: 9px; margin-bottom: 8px; }
    .sugg-list { border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; margin-top: 4px; }
    .sugg-item { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); }
    .sugg-item:last-child { border-bottom: none; }
    .sugg-name { font-size: 14px; font-weight: 600; color: #f1f5f9; }
    .sugg-tel { font-size: 11px; color: rgba(241,245,249,0.4); }
    .dur-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; margin-bottom: 12px; }
    .dur-btn { border-radius: 9px; padding: 8px 4px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(241,245,249,0.6); }
    .dur-active { background: rgba(124,58,237,0.2); border-color: rgba(124,58,237,0.4); color: #a78bfa; }
    .date-row { display: flex; gap: 10px; }
    .date-box { flex: 1; background: rgba(255,255,255,0.05); border-radius: 9px; padding: 10px 12px; border: 1px solid rgba(255,255,255,0.08); }
    .date-lbl { font-size: 10px; color: rgba(241,245,249,0.4); margin-bottom: 4px; }
    .date-input { background: transparent; border: none; color: #f1f5f9; font-size: 13px; width: 100%; }
    .svc-toggles { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
    .svc-toggle { border-radius: 10px; padding: 8px 12px; font-size: 13px; font-weight: 600; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); color: rgba(241,245,249,0.6); display: flex; align-items: center; gap: 6px; }
    .svc-active { background: rgba(var(--srv-color-rgb, 124,58,237), 0.15); border-color: var(--srv-color, rgba(124,58,237,0.4)); color: var(--srv-color, #a78bfa); }
    .cred-block { border-top: 1px solid rgba(255,255,255,0.07); padding-top: 12px; margin-top: 8px; }
    .cred-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .cred-title { font-size: 12px; font-weight: 700; color: rgba(241,245,249,0.5); letter-spacing: 0.04em; text-transform: uppercase; }
    .cred-remove { font-size: 16px; color: rgba(241,245,249,0.35); }
    .cuentas-sugg { margin-top: 6px; }
    .sugg-lbl { font-size: 11px; color: rgba(241,245,249,0.3); margin-bottom: 4px; }
    .cuenta-sugg-item { font-size: 12px; color: #a78bfa; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer; }
    .empty-svc { text-align: center; padding: 16px; color: rgba(241,245,249,0.3); font-size: 13px; }
  `],
})
export class EditarVentaPage implements OnInit {
  ventaId = '';
  loading = signal(true);
  saving = signal(false);

  clienteId = '';
  nombreCliente = '';
  clienteBusqueda = '';
  clientesBusqueda = signal<Cliente[]>([]);

  duracionMeses = 1;
  fechaInicio = '';
  fechaVencimiento = '';

  todosServicios = signal<Servicio[]>([]);
  serviciosForm = signal<ServicioEditForm[]>([]);

  monto: number | null = null;
  notas = '';

  private cuentasCache: Cuenta[] = [];

  duraciones = [
    { meses: 1, label: '1 mes' },
    { meses: 3, label: '3 meses' },
    { meses: 6, label: '6 meses' },
    { meses: 12, label: '1 año' },
  ];

  constructor(
    private route: ActivatedRoute,
    private ventasApi: VentasApiService,
    private clientesApi: ClientesApiService,
    private serviciosApi: ServiciosApiService,
    private inventarioApi: InventarioApiService,
    private ventaEvents: VentaEventsService,
    public navCtrl: NavController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {
    addIcons({ chevronBackOutline, closeOutline });
  }

  ngOnInit() {
    this.ventaId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.ventaId) { this.navCtrl.back(); return; }

    forkJoin({
      venta: this.ventasApi.getOne(this.ventaId),
      servicios: this.serviciosApi.getAll(),
      cuentas: this.inventarioApi.getAll(),
    }).subscribe(({ venta, servicios, cuentas }) => {
      this.todosServicios.set(servicios.filter(s => s.activo));
      this.cuentasCache = cuentas;

      this.clienteId = venta.clienteId;
      this.nombreCliente = venta.nombreCliente;
      this.clienteBusqueda = venta.nombreCliente;
      this.monto = venta.monto;
      this.duracionMeses = venta.duracionMeses;
      this.notas = venta.notas || '';
      this.fechaInicio = this.toDateInput(venta.fechaInicio);
      this.fechaVencimiento = this.toDateInput(venta.fechaVencimiento);

      const forms: ServicioEditForm[] = venta.servicios.map(s => ({
        nombreServicio: s.nombreServicio,
        cuentaId: s.cuentaId,
        emailCuenta: s.emailCuenta,
        claveCuenta: s.claveCuenta,
        numeroPerfil: Number(s.numeroPerfil) || null,
        clavePerfil: s.clavePerfil || '',
        perfilesDisponibles: [],
        cuentasDisponibles: [],
      }));
      this.serviciosForm.set(forms);
      for (const sf of forms) this.actualizarPerfilesDisponibles(sf);

      this.loading.set(false);
    });
  }

  private actualizarPerfilesDisponibles(sf: ServicioEditForm) {
    const cuenta = this.cuentasCache.find(c => c._id === sf.cuentaId);
    sf.perfilesDisponibles = cuenta
      ? cuenta.perfiles
          .filter(p => !p.ocupado || p.ventaId === this.ventaId)
          .map(p => ({ numero: p.numero, clavePerfil: p.clavePerfil }))
      : [];
    this.serviciosForm.update(f => [...f]);
  }

  toDateInput(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toISOString().split('T')[0];
  }

  setDuracion(m: number) {
    this.duracionMeses = m;
    this.calcFechaVenc();
  }

  calcFechaVenc() {
    if (!this.fechaInicio) return;
    const d = new Date(this.fechaInicio + 'T00:00:00');
    d.setMonth(d.getMonth() + this.duracionMeses);
    this.fechaVencimiento = d.toISOString().split('T')[0];
  }

  // ── Cliente ──────────────────────────────────────────────────────────────

  buscarClientes(q: string) {
    if (q.length < 2) { this.clientesBusqueda.set([]); return; }
    this.clientesApi.getAll(q).subscribe(cs => this.clientesBusqueda.set(cs.slice(0, 6)));
  }

  seleccionarCliente(c: Cliente) {
    this.clienteId = c._id;
    this.nombreCliente = c.nombre;
    this.clienteBusqueda = c.nombre;
    this.clientesBusqueda.set([]);
  }

  // ── Servicios ────────────────────────────────────────────────────────────

  isServicioSeleccionado(srv: Servicio): boolean {
    return this.serviciosForm().some(sf => sf.nombreServicio === srv.nombre);
  }

  toggleServicio(srv: Servicio) {
    if (this.isServicioSeleccionado(srv)) {
      this.quitarServicio(srv.nombre);
    } else {
      this.serviciosForm.update(f => [...f, {
        nombreServicio: srv.nombre, cuentaId: '', emailCuenta: '', claveCuenta: '',
        numeroPerfil: null, clavePerfil: '', perfilesDisponibles: [], cuentasDisponibles: [],
      }]);
    }
  }

  quitarServicio(nombreServicio: string) {
    this.serviciosForm.update(f => f.filter(sf => sf.nombreServicio !== nombreServicio));
  }

  buscarCuentas(sf: ServicioEditForm) {
    this.inventarioApi.getDisponibles(sf.nombreServicio).subscribe(cs => {
      sf.cuentasDisponibles = sf.emailCuenta
        ? cs.filter((c: CuentaDisponible) => c.email.toLowerCase().includes(sf.emailCuenta.toLowerCase()))
        : cs;
      this.serviciosForm.update(f => [...f]);
    });
  }

  seleccionarCuenta(sf: ServicioEditForm, cuenta: CuentaDisponible) {
    sf.cuentaId = cuenta.cuentaId;
    sf.emailCuenta = cuenta.email;
    sf.claveCuenta = cuenta.clave || '';
    sf.cuentasDisponibles = [];
    sf.perfilesDisponibles = cuenta.perfilesDisponibles || [];
    const primero = sf.perfilesDisponibles[0];
    sf.numeroPerfil = primero?.numero ?? null;
    sf.clavePerfil = primero?.clavePerfil || '';
    this.serviciosForm.update(f => [...f]);
  }

  getServicio(nombre: string): Servicio | undefined {
    return this.todosServicios().find(s => s.nombre === nombre);
  }

  // ── Guardar ──────────────────────────────────────────────────────────────

  canSave(): boolean {
    return !!this.clienteId && !!this.fechaInicio && !!this.fechaVencimiento &&
      this.serviciosForm().length > 0 && !!this.monto;
  }

  async guardar() {
    const sinCuenta = this.serviciosForm().find(sf => !sf.cuentaId);
    if (sinCuenta) {
      const t = await this.toastCtrl.create({ message: `Selecciona una cuenta para ${sinCuenta.nombreServicio}`, duration: 2500, color: 'warning' });
      return t.present();
    }
    const sinPerfil = this.serviciosForm().find(sf =>
      !sf.numeroPerfil && this.getServicio(sf.nombreServicio)?.requiereNumeroPerfil !== false);
    if (sinPerfil) {
      const t = await this.toastCtrl.create({ message: `Selecciona un perfil para ${sinPerfil.nombreServicio}`, duration: 2500, color: 'warning' });
      return t.present();
    }

    const loading = await this.loadingCtrl.create({ message: 'Guardando…' });
    await loading.present();
    this.saving.set(true);
    try {
      const dto = {
        clienteId: this.clienteId,
        nombreCliente: this.nombreCliente,
        monto: this.monto,
        duracionMeses: this.duracionMeses,
        fechaInicio: this.fechaInicio,
        fechaVencimiento: this.fechaVencimiento,
        notas: this.notas,
        servicios: this.serviciosForm().map(sf => ({
          cuentaId: sf.cuentaId,
          emailCuenta: sf.emailCuenta,
          claveCuenta: sf.claveCuenta,
          numeroPerfil: sf.numeroPerfil,
          clavePerfil: sf.clavePerfil || undefined,
        })),
      };
      const ventaActualizada = await new Promise<any>((res, rej) =>
        this.ventasApi.update(this.ventaId, dto).subscribe({ next: res, error: rej }));
      this.ventaEvents.notificar();

      if (ventaActualizada?.mensajeGenerado) {
        const alert = await this.alertCtrl.create({
          header: 'Venta actualizada',
          message: 'El mensaje fue regenerado. ¿Copiarlo ahora?',
          buttons: [
            { text: 'Cerrar', role: 'cancel', handler: () => this.navCtrl.back() },
            {
              text: 'Copiar mensaje',
              handler: async () => {
                try {
                  const { Clipboard } = await import('@capacitor/clipboard');
                  await Clipboard.write({ string: ventaActualizada.mensajeGenerado });
                } catch { /* ignore */ }
                this.navCtrl.back();
              },
            },
          ],
        });
        await alert.present();
      } else {
        const t = await this.toastCtrl.create({ message: 'Venta actualizada', duration: 2000, color: 'success' });
        await t.present();
        this.navCtrl.back();
      }
    } catch (e: any) {
      const t = await this.toastCtrl.create({ message: e?.error?.message || 'Error al guardar', duration: 3000, color: 'danger' });
      await t.present();
    } finally {
      loading.dismiss();
      this.saving.set(false);
    }
  }
}
