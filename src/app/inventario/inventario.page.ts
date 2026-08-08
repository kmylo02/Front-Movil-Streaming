import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonRefresher, IonRefresherContent, IonItem, IonLabel,
  IonModal, IonInput, IonSelect, IonSelectOption, IonToggle, IonBadge,
  IonSpinner, IonSearchbar, IonTextarea, AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, closeOutline, checkmarkOutline, pencilOutline, trashOutline, eyeOutline, copyOutline } from 'ionicons/icons';
import { InventarioApiService, ServiciosApiService, Cuenta, Servicio } from '../core/services/api.service';
import { AuthService } from '../core/services/auth.service';
import { formatoPesos, parsePesos } from '../core/utils/moneda.util';
import { Clipboard } from '@capacitor/clipboard';

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonRefresher, IonRefresherContent, IonItem, IonLabel,
    IonModal, IonInput, IonSelect, IonSelectOption, IonToggle, IonBadge,
    IonSpinner, IonSearchbar, IonTextarea,
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

      <div class="filtros-row">
        <ion-item class="f-select" lines="none">
          <ion-select [ngModel]="filtroEstado()" (ngModelChange)="filtroEstado.set($event)"
                      interface="popover" placeholder="Vigencia">
            <ion-select-option value="">Todos los estados</ion-select-option>
            <ion-select-option value="vig-vencida">🔴 Vencidas</ion-select-option>
            <ion-select-option value="vig-proxima">🟡 Próximas a vencer</ion-select-option>
            <ion-select-option value="vig-vigente">🟢 Vigentes</ion-select-option>
            <ion-select-option value="sin-fecha">⚪ Sin fecha</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item class="f-select" lines="none">
          <ion-select [ngModel]="filtroRenovable()" (ngModelChange)="filtroRenovable.set($event)"
                      interface="popover" placeholder="Renovación">
            <ion-select-option value="">Todas</ion-select-option>
            <ion-select-option value="si">♻ Con renovación</ion-select-option>
            <ion-select-option value="no">Sin renovación</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item class="f-select" lines="none">
          <ion-select [ngModel]="ordenarPor()" (ngModelChange)="ordenarPor.set($event)" interface="popover">
            <ion-select-option value="vencimiento">Vencimiento próximo</ion-select-option>
            <ion-select-option value="estado">Estado de urgencia</ion-select-option>
            <ion-select-option value="plataforma">Plataforma</ion-select-option>
          </ion-select>
        </ion-item>
      </div>

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
              @if (c.fechaVencimientoCuenta) {
                <div class="vigencia-row">
                  <span class="vig-badge" [ngClass]="estadoVigencia(c.fechaVencimientoCuenta)">
                    {{ labelVigencia(c.fechaVencimientoCuenta) }}
                  </span>
                  <span class="vig-fecha">{{ formatFecha(c.fechaVencimientoCuenta) }}</span>
                  @if (c.renovable) { <span class="vig-badge renov-badge">♻</span> }
                </div>
              } @else if (c.renovable) {
                <div class="vigencia-row"><span class="vig-badge renov-badge">♻ Renovable</span></div>
              }
              <div class="perfiles-row">
                @for (p of c.perfiles; track p.numero) {
                  <div class="perfil-pip" [class.pip-occ]="p.ocupado" [title]="p.ocupado ? p.clienteNombre || 'Ocupado' : 'Libre'"></div>
                }
                <span class="perfiles-txt">{{ libres(c) }}/{{ c.totalPerfiles }} libres</span>
              </div>
              <div class="cuenta-actions">
                <button class="act-btn" (click)="verDetalle(c)">
                  <ion-icon name="eye-outline"></ion-icon>
                </button>
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
              <ion-select [(ngModel)]="form.servicioId" (ionChange)="onServicioChange()" interface="action-sheet">
                @for (s of servicios(); track s._id) {
                  <ion-select-option [value]="s._id">{{ s.nombre }}</ion-select-option>
                }
              </ion-select>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Tipo</ion-label>
              <ion-select [(ngModel)]="form.tipo" (ionChange)="onTipoChange()" interface="action-sheet">
                <ion-select-option value="compartida">Compartida (perfiles)</ion-select-option>
                <ion-select-option value="individual">Individual</ion-select-option>
              </ion-select>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Email *</ion-label>
              <ion-input [(ngModel)]="form.email" type="email" placeholder="cuenta@gmail.com"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Clave *</ion-label>
              <ion-input [(ngModel)]="form.clave" type="text" placeholder="Contraseña"></ion-input>
              <ion-button slot="end" fill="clear" size="small" (click)="generarClave()">Generar</ion-button>
            </ion-item>
            @if (form.tipo === 'individual') {
              <ion-item class="f-item" lines="none">
                <ion-label position="stacked">Número de perfil específico *</ion-label>
                <ion-input [(ngModel)]="form.perfilNumero" type="number" placeholder="Ej: 3" min="1" max="7"></ion-input>
              </ion-item>
            } @else {
              <ion-item class="f-item" lines="none">
                <ion-label position="stacked">Total perfiles</ion-label>
                <ion-input [(ngModel)]="form.totalPerfiles" type="number" placeholder="4" (ionChange)="actualizarClaves()"></ion-input>
              </ion-item>
            }
            @if ((form.totalPerfiles || 0) > 0 && form.tipo !== 'individual' && servicioRequiereClave()) {
              <div class="claves-perfil-block">
                <div class="claves-perfil-title">Claves por perfil (opcional)</div>
                <div class="claves-grid">
                  @for (i of perfilesRange(); track i) {
                    <ion-item class="f-item claves-item" lines="none">
                      <ion-label position="stacked">Perfil {{ i + 1 }}</ion-label>
                      <ion-input [(ngModel)]="clavesPerfil[i]" placeholder="PIN"></ion-input>
                    </ion-item>
                  }
                </div>
              </div>
            }

            <div class="section-label">Vigencia de la cuenta</div>
            <div class="dur-grid">
              @for (d of DURACIONES_CUENTA; track d.meses) {
                <button type="button" class="dur-btn" [class.active]="duracionCuenta === d.meses"
                        (click)="onDuracionCuentaChange(d.meses)">
                  {{ d.label }}
                </button>
              }
            </div>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Fecha inicio</ion-label>
              <ion-input [(ngModel)]="form.fechaInicioCuenta" type="date" (ionChange)="onFechaInicioCuentaChange()"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Fecha vencimiento</ion-label>
              <ion-input [(ngModel)]="form.fechaVencimientoCuenta" type="date"></ion-input>
            </ion-item>
            <ion-item class="f-item" lines="none">
              <ion-label>Renovable</ion-label>
              <ion-toggle [(ngModel)]="form.renovable" slot="end"></ion-toggle>
            </ion-item>

            <div class="section-label">Costo</div>
            @if (form.tipo === 'compartida') {
              <ion-item class="f-item" lines="none">
                <ion-label position="stacked">Costo de la cuenta ($)</ion-label>
                <ion-input [ngModel]="formatoPesos(form.valorCuenta)"
                           (ngModelChange)="form.valorCuenta = parsePesos($event)"
                           type="text" inputmode="numeric" placeholder="0"></ion-input>
              </ion-item>
            } @else {
              <ion-item class="f-item" lines="none">
                <ion-label position="stacked">Costo de pantalla ($)</ion-label>
                <ion-input [ngModel]="formatoPesos(form.valorPantalla)"
                           (ngModelChange)="form.valorPantalla = parsePesos($event)"
                           type="text" inputmode="numeric" placeholder="0"></ion-input>
              </ion-item>
            }
            <ion-item class="f-item" lines="none">
              <ion-label position="stacked">Notas</ion-label>
              <ion-textarea [(ngModel)]="form.notas" placeholder="Proveedor, condiciones de renovación, observaciones..." rows="2"></ion-textarea>
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

    <!-- Modal detalle perfiles / clientes asignados -->
    <ion-modal [isOpen]="!!detalleModal()" (didDismiss)="detalleModal.set(null)">
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-buttons slot="start">
              <ion-button (click)="detalleModal.set(null)"><ion-icon name="close-outline"></ion-icon></ion-button>
            </ion-buttons>
            <ion-title>{{ detalleModal()?.nombreServicio }}</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          @if (detalleModal(); as d) {
            <div class="detalle-header">
              <div class="detalle-email">{{ d.email }}</div>
              <div class="detalle-sub">
                <span class="tipo-badge" [class.individual]="d.tipo === 'individual'">
                  {{ d.tipo === 'individual' ? 'Individual' : 'Compartida' }}
                </span>
                <span class="detalle-stat">{{ libres(d) }}/{{ d.totalPerfiles }} disponibles</span>
                @if (d.operadorNombre) {
                  <span class="detalle-stat">· Agregada por {{ d.operadorNombre }}</span>
                }
              </div>
              @if (d.notas) {
                <div class="detalle-notas">📝 {{ d.notas }}</div>
              }
            </div>
            @if (clientesAsignados(d).length > 0) {
              <div class="detalle-section-title">👥 Clientes asignados</div>
              @for (ca of clientesAsignados(d); track ca.perfil) {
                <div class="cliente-row">
                  <div class="cr-avatar">{{ ca.nombre.charAt(0) }}</div>
                  <div class="cr-info">
                    <div class="cr-nombre">{{ ca.nombre }}</div>
                    <div class="cr-perfil">Perfil {{ ca.perfil }}{{ ca.pin ? ' · PIN: ' + ca.pin : '' }}</div>
                  </div>
                  <span class="pr-badge ocupado-badge">En uso</span>
                </div>
              }
            }
            <div class="detalle-section-title">Detalle de perfiles</div>
            @for (p of d.perfiles; track p.numero) {
              <div class="perfil-row" [class.ocupado]="p.ocupado">
                <div class="pr-num">Perfil {{ p.numero }}</div>
                <div class="pr-info">
                  @if (p.ocupado) {
                    <span class="pr-cliente">👤 {{ p.clienteNombre }}</span>
                    <span class="pr-badge ocupado-badge">En uso</span>
                  } @else {
                    <span class="pr-libre">Disponible</span>
                    <span class="pr-badge libre-badge">Libre</span>
                  }
                </div>
                @if (p.clavePerfil) { <div class="pr-clave">PIN: {{ p.clavePerfil }}</div> }
              </div>
            }
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
    .claves-perfil-block { margin-top: 4px; }
    .claves-perfil-title { font-size: 12px; font-weight: 600; color: rgba(241,245,249,0.5); margin-bottom: 8px; }
    .claves-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
    .claves-item { margin: 0; }
    .section-label { font-size: 11px; font-weight: 700; color: rgba(241,245,249,0.35); text-transform: uppercase; letter-spacing: 0.06em; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.07); margin-top: 6px; }
    .dur-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .dur-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 8px 4px; font-size: 12px; font-weight: 600; color: rgba(241,245,249,0.6); font-family: inherit; }
    .dur-btn.active { background: rgba(124,58,237,0.25); border-color: #7c3aed; color: #c4b5fd; }
    .detalle-notas { font-size: 12px; color: rgba(241,245,249,0.5); background: rgba(255,255,255,0.03); border-radius: 8px; padding: 8px 12px; margin: 10px 16px 0; line-height: 1.5; }
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
    .filtros-row { display:flex; gap:8px; padding:2px 16px 10px; overflow-x:auto; }
    .f-select { --background:rgba(255,255,255,0.05); --border-radius:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; --min-height:38px; flex-shrink:0; min-width:140px; }
    .vigencia-row { display:flex; align-items:center; gap:6px; margin-bottom:8px; flex-wrap:wrap; }
    .vig-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; }
    .vig-vencida { background:rgba(244,63,94,0.15); color:#f87171; }
    .vig-proxima { background:rgba(245,158,11,0.15); color:#fbbf24; }
    .vig-vigente { background:rgba(16,185,129,0.15); color:#34d399; }
    .renov-badge { background:rgba(124,58,237,0.15); color:#a78bfa; }
    .vig-fecha { font-size:11px; color:rgba(241,245,249,0.4); }
    .detalle-header { padding:16px 16px 0; }
    .detalle-email { font-size:15px; font-weight:700; color:#f1f5f9; font-family:monospace; word-break:break-all; }
    .detalle-sub { display:flex; align-items:center; gap:10px; margin-top:6px; }
    .tipo-badge { font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; background:rgba(16,185,129,0.15); color:#34d399; }
    .tipo-badge.individual { background:rgba(124,58,237,0.15); color:#a78bfa; }
    .detalle-stat { font-size:12px; color:rgba(241,245,249,0.4); }
    .detalle-section-title { font-size:11px; font-weight:700; color:rgba(241,245,249,0.4); text-transform:uppercase; letter-spacing:0.05em; margin:18px 16px 10px; }
    .cliente-row { display:flex; align-items:center; gap:10px; margin:0 16px 8px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:10px 12px; }
    .cr-avatar { width:32px; height:32px; border-radius:9px; background:linear-gradient(135deg,#7c3aed,#a855f7); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; flex-shrink:0; }
    .cr-info { flex:1; min-width:0; }
    .cr-nombre { font-size:13px; font-weight:700; color:#f1f5f9; }
    .cr-perfil { font-size:11px; color:rgba(241,245,249,0.4); margin-top:1px; }
    .pr-badge { font-size:9px; font-weight:700; padding:2px 7px; border-radius:99px; flex-shrink:0; }
    .ocupado-badge { background:rgba(124,58,237,0.15); color:#a78bfa; }
    .libre-badge { background:rgba(16,185,129,0.15); color:#34d399; }
    .perfil-row { margin:0 16px 8px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:10px 12px; }
    .perfil-row.ocupado { border-color:rgba(124,58,237,0.2); }
    .pr-num { font-size:12px; font-weight:700; color:#f1f5f9; margin-bottom:4px; }
    .pr-info { display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .pr-cliente { font-size:12px; color:rgba(241,245,249,0.6); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .pr-libre { font-size:12px; color:rgba(241,245,249,0.3); }
    .pr-clave { font-size:11px; font-family:monospace; color:rgba(241,245,249,0.4); background:rgba(0,0,0,0.2); border-radius:6px; padding:3px 8px; margin-top:6px; display:inline-block; }
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
  form: Partial<Cuenta> & { renovable?: boolean; perfilNumero?: number } = {};
  clavesPerfil: string[] = [];

  busqueda = signal('');
  plataformasSeleccionadas = signal<Set<string>>(new Set());
  claveOriginal = '';
  selectedServicioId = signal<string>('');
  filtroEstado = signal('');
  filtroRenovable = signal('');
  ordenarPor = signal('vencimiento');
  detalleModal = signal<Cuenta | null>(null);

  servicioRequiereClave = computed(() =>
    this.servicios().find(s => s._id === this.selectedServicioId())?.requiereClavePerfil ?? false
  );

  showAfectados = signal(false);
  clientesAfectados = signal<any[]>([]);

  formatoPesos = formatoPesos;
  parsePesos = parsePesos;

  duracionCuenta = 1;
  DURACIONES_CUENTA = [
    { meses: 1, label: 'Mensual' },
    { meses: 3, label: 'Trimestral' },
    { meses: 6, label: 'Semestral' },
    { meses: 12, label: 'Anual' },
  ];

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
    const estado = this.filtroEstado();
    const renovable = this.filtroRenovable();

    if (plataformas.size > 0) list = list.filter(c => plataformas.has(c.nombreServicio));
    if (q) list = list.filter(c => c.email.toLowerCase().includes(q));
    if (estado) {
      list = list.filter(c => estado === 'sin-fecha'
        ? !c.fechaVencimientoCuenta
        : this.estadoVigencia(c.fechaVencimientoCuenta) === estado);
    }
    if (renovable === 'si') list = list.filter(c => !!c.renovable);
    else if (renovable === 'no') list = list.filter(c => !c.renovable);

    const ordenar = this.ordenarPor();
    if (ordenar === 'vencimiento') {
      list = [...list].sort((a, b) => {
        if (!a.fechaVencimientoCuenta && !b.fechaVencimientoCuenta) return 0;
        if (!a.fechaVencimientoCuenta) return 1;
        if (!b.fechaVencimientoCuenta) return -1;
        return new Date(a.fechaVencimientoCuenta).getTime() - new Date(b.fechaVencimientoCuenta).getTime();
      });
    } else if (ordenar === 'estado') {
      const prioridad = (c: Cuenta) => {
        const est = this.estadoVigencia(c.fechaVencimientoCuenta);
        if (est === 'vig-vencida') return 0;
        if (est === 'vig-proxima') return 1;
        if (est === 'vig-vigente') return 2;
        return 3;
      };
      list = [...list].sort((a, b) => prioridad(a) - prioridad(b));
    } else if (ordenar === 'plataforma') {
      list = [...list].sort((a, b) => a.nombreServicio.localeCompare(b.nombreServicio));
    }
    return list;
  });

  constructor(
    private inventarioApi: InventarioApiService,
    private serviciosApi: ServiciosApiService,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private auth: AuthService,
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

  verDetalle(c: Cuenta) { this.detalleModal.set(c); }

  clientesAsignados(c: Cuenta): { nombre: string; perfil: number; pin?: string }[] {
    return c.perfiles
      .filter(p => p.ocupado && p.clienteNombre)
      .map(p => ({ nombre: p.clienteNombre!, perfil: p.numero, pin: p.clavePerfil }));
  }

  estadoVigencia(fechaVenc?: string): string {
    if (!fechaVenc) return '';
    const diff = new Date(fechaVenc).getTime() - Date.now();
    const dias = diff / (1000 * 60 * 60 * 24);
    if (dias < 0) return 'vig-vencida';
    if (dias <= 7) return 'vig-proxima';
    return 'vig-vigente';
  }

  labelVigencia(fechaVenc?: string): string {
    if (!fechaVenc) return '';
    const diff = new Date(fechaVenc).getTime() - Date.now();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (dias < 0) return 'Vencida';
    if (dias === 0) return 'Vence hoy';
    if (dias <= 7) return `Vence en ${dias}d`;
    return 'Vigente';
  }

  formatFecha(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  toggleFiltroServicio(nombre: string) {
    const set = new Set(this.plataformasSeleccionadas());
    if (set.has(nombre)) set.delete(nombre); else set.add(nombre);
    this.plataformasSeleccionadas.set(set);
  }

  openModal(c?: Cuenta) {
    this.editando.set(c || null);
    this.claveOriginal = c?.clave || '';
    this.form = c ? { ...c, fechaInicioCuenta: this.toDateInput(c.fechaInicioCuenta), fechaVencimientoCuenta: this.toDateInput(c.fechaVencimientoCuenta) } : { tipo: 'compartida', totalPerfiles: 4 };
    this.selectedServicioId.set(c?.servicioId || '');
    this.clavesPerfil = c ? c.perfiles.map(p => p.clavePerfil || '') : [];
    this.duracionCuenta = c ? this.estimarDuracionCuenta(this.form.fechaInicioCuenta, this.form.fechaVencimientoCuenta) : 1;
    this.showModal.set(true);
  }

  private toDateInput(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toISOString().split('T')[0];
  }

  estimarDuracionCuenta(inicio?: string, fin?: string): number {
    if (!inicio || !fin) return 1;
    const a = new Date(inicio + 'T12:00:00');
    const b = new Date(fin + 'T12:00:00');
    const meses = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
    const opciones = [1, 3, 6, 12];
    return opciones.reduce((prev, cur) => Math.abs(cur - meses) < Math.abs(prev - meses) ? cur : prev, 1);
  }

  onDuracionCuentaChange(meses: number) {
    this.duracionCuenta = meses;
    if (this.form.fechaInicioCuenta) {
      const d = new Date(this.form.fechaInicioCuenta + 'T12:00:00');
      d.setMonth(d.getMonth() + meses);
      this.form.fechaVencimientoCuenta = d.toISOString().split('T')[0];
    }
  }

  onFechaInicioCuentaChange() {
    if (this.form.fechaInicioCuenta && this.duracionCuenta) {
      const d = new Date(this.form.fechaInicioCuenta + 'T12:00:00');
      d.setMonth(d.getMonth() + this.duracionCuenta);
      this.form.fechaVencimientoCuenta = d.toISOString().split('T')[0];
    }
  }

  onServicioChange() {
    const s = this.servicios().find(x => x._id === this.form.servicioId);
    if (s) this.form.nombreServicio = s.nombre;
    this.selectedServicioId.set(this.form.servicioId || '');
  }

  onTipoChange() {
    if (this.form.tipo === 'individual') {
      this.form.totalPerfiles = 1;
      this.form.perfilNumero = this.form.perfilNumero || 1;
    }
    this.actualizarClaves();
  }

  actualizarClaves() {
    const n = Number(this.form.totalPerfiles) || 0;
    this.clavesPerfil = Array.from({ length: n }, (_, i) => this.clavesPerfil[i] || '');
  }

  perfilesRange(): number[] {
    return Array.from({ length: Number(this.form.totalPerfiles) || 0 }, (_, i) => i);
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
    if (!this.form.servicioId || !this.form.email || !this.form.clave) {
      const t = await this.toastCtrl.create({ message: 'Completa plataforma, email y clave', duration: 2500, color: 'warning' });
      return t.present();
    }
    if (this.form.tipo === 'individual' && !this.form.perfilNumero) {
      const t = await this.toastCtrl.create({ message: 'Indica el número de perfil', duration: 2500, color: 'warning' });
      return t.present();
    }
    this.saving.set(true);
    const claveNueva = this.form.clave;
    const claveCambio = !!this.editando() && !!claveNueva && claveNueva !== this.claveOriginal;
    const cuentaId = this.editando()?._id;
    const dto: any = {
      ...this.form,
      totalPerfiles: Number(this.form.totalPerfiles) || 0,
      perfilNumero: this.form.tipo === 'individual' ? Number(this.form.perfilNumero) : undefined,
      valorCuenta: this.form.valorCuenta != null && (this.form.valorCuenta as any) !== '' ? Number(this.form.valorCuenta) : undefined,
      valorPantalla: this.form.valorPantalla != null && (this.form.valorPantalla as any) !== '' ? Number(this.form.valorPantalla) : undefined,
      clavesPerfil: this.clavesPerfil.filter(Boolean),
    };
    if (!cuentaId) {
      dto.operadorId = this.auth.usuario()?.id;
      dto.operadorNombre = this.auth.usuario()?.nombre;
    }
    try {
      const op = cuentaId ? this.inventarioApi.update(cuentaId, dto) : this.inventarioApi.create(dto);
      await new Promise<void>((res, rej) => op.subscribe({ next: () => res(), error: rej }));
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
    } catch (e: any) {
      const msg = e?.error?.message;
      const t = await this.toastCtrl.create({
        message: Array.isArray(msg) ? msg.join(', ') : (msg || 'Error al guardar'),
        duration: 3500, color: 'danger',
      });
      t.present();
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
    try {
      await new Promise<void>((res, rej) => this.inventarioApi.toggle(c._id).subscribe({ next: () => res(), error: rej }));
      await this.load();
    } catch (e: any) {
      const t = await this.toastCtrl.create({ message: e?.error?.message || 'Error al cambiar estado', duration: 3000, color: 'danger' });
      t.present();
    }
  }

  async eliminar(c: Cuenta) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar cuenta',
      message: `¿Eliminar ${c.email}?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar', role: 'destructive', handler: async () => {
          try {
            await new Promise<void>((res, rej) => this.inventarioApi.delete(c._id).subscribe({ next: () => res(), error: rej }));
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
