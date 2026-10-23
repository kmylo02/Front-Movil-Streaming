import { Component, OnDestroy, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardContent } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import {
  AgendaRecordatorios,
  ItemAgenda,
  NotificacionesApiService,
  TIPO_RECORDATORIO_LABEL,
} from '../core/services/api.service';
import { VentaEventsService } from '../core/services/venta-events.service';

/**
 * Recordatorios del día para enviar desde WhatsApp Business (paridad con la web):
 * abre WhatsApp con el mensaje escrito y registra que el cliente fue contactado.
 */
@Component({
  selector: 'app-recordatorios-hoy',
  standalone: true,
  imports: [CommonModule, IonCard, IonCardContent],
  template: `
    <ion-card class="section-card">
      <ion-card-content>
        <div class="rec-head">
          <div class="section-title">Recordatorios de hoy</div>
          @if (pendientes() > 0) { <span class="rec-count">{{ pendientes() }}</span> }
        </div>
        <div class="rec-nota">
          {{ agenda()?.apiConfigurada ? 'Envío automático activo.' : 'Toca «WhatsApp» y envía desde tu WhatsApp Business.' }}
        </div>
        @if (cargando()) {
          <div class="rec-vacio">Cargando…</div>
        } @else if (!agenda() || agenda()!.items.length === 0) {
          <div class="rec-vacio">✅ No hay recordatorios para hoy</div>
        } @else {
          @for (g of grupos(); track g.tipo) {
            @if (g.items.length > 0) {
              <div class="rec-grupo">{{ g.titulo }} ({{ g.items.length }})</div>
              @for (it of g.items; track it.ventaId) {
                <div class="rec-item" [class.rec-hecho]="it.contactado">
                  <div class="rec-info">
                    <div class="rec-nombre">{{ it.nombreCliente }}</div>
                    <div class="rec-detalle">{{ it.servicios }} · {{ it.fechaVencimiento }}</div>
                  </div>
                  @if (it.contactado) {
                    <span class="rec-ok">✓ {{ it.contactado.via === 'api' ? 'Enviado' : 'Contactado' }}</span>
                  } @else if (it.enlace) {
                    <button class="rec-btn" (click)="abrir(it)">WhatsApp</button>
                  } @else {
                    <span class="rec-sin">Sin número</span>
                  }
                </div>
              }
            }
          }
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .section-card { margin: 8px 16px; }
    .section-title { font-size: 13px; font-weight: 700; color: rgba(241,245,249,0.6); }
    .rec-head { display: flex; align-items: center; justify-content: space-between; }
    .rec-count { background: rgba(37,211,102,0.15); color: #4ade80; border-radius: 99px; font-size: 11px; font-weight: 700; padding: 2px 9px; }
    .rec-nota { font-size: 11px; color: rgba(241,245,249,0.4); margin: 4px 0 8px; }
    .rec-vacio { text-align: center; padding: 16px 0; color: rgba(241,245,249,0.4); font-size: 13px; }
    .rec-grupo { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .05em; color: rgba(241,245,249,0.4); margin: 10px 0 4px; }
    .rec-item { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid rgba(255,255,255,0.05); }
    .rec-hecho { opacity: .6; }
    .rec-info { min-width: 0; }
    .rec-nombre { font-size: 14px; font-weight: 600; color: #f1f5f9; }
    .rec-detalle { font-size: 11px; color: rgba(241,245,249,0.45); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .rec-btn { flex-shrink: 0; background: #25d366; color: #052e16; font-weight: 700; font-size: 12px; padding: 7px 12px; border-radius: 8px; border: 0; }
    .rec-ok { flex-shrink: 0; font-size: 12px; font-weight: 700; color: #4ade80; }
    .rec-sin { flex-shrink: 0; font-size: 12px; color: #fbbf24; }
  `],
})
export class RecordatoriosHoyComponent implements OnInit, OnDestroy {
  agenda = signal<AgendaRecordatorios | null>(null);
  cargando = signal(true);
  private sub?: Subscription;

  pendientes = computed(() => (this.agenda()?.items ?? []).filter((i) => !i.contactado && i.enlace).length);
  grupos = computed(() => {
    const items = this.agenda()?.items ?? [];
    return (['hoy', 'antes_1d', 'vencida_1d'] as const).map((tipo) => ({
      tipo,
      titulo: TIPO_RECORDATORIO_LABEL[tipo],
      items: items.filter((i) => i.tipo === tipo),
    }));
  });

  constructor(private api: NotificacionesApiService, private ventaEvents: VentaEventsService) {}

  ngOnInit() {
    this.cargar();
    // Si se renueva o edita una venta, la agenda cambia.
    this.sub = this.ventaEvents.ventaCambiada$.subscribe(() => this.cargar());
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  cargar() {
    this.cargando.set(true);
    this.api.agenda().subscribe({
      next: (a) => { this.agenda.set(a); this.cargando.set(false); },
      error: () => this.cargando.set(false),
    });
  }

  abrir(it: ItemAgenda) {
    if (!it.enlace) return;
    // Igual que en Clientes: wa.me abre la app de WhatsApp / WhatsApp Business del teléfono.
    if (!it.enlace.startsWith('https://wa.me/')) return;
    window.open(it.enlace, '_blank', 'noopener,noreferrer');
    this.api.registrarWhatsappApp(it.ventaId).subscribe({
      next: () => this.agenda.update((a) => a && {
        ...a,
        items: a.items.map((x) => x.ventaId === it.ventaId ? { ...x, contactado: { via: 'whatsapp_app', fecha: new Date().toISOString() } } : x),
      }),
    });
  }
}
