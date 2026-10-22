import { Injectable } from '@angular/core';

// v2: la clave anterior ('sm_backend_respaldo_activo') era permanente y dejaba
// clientes pegados al respaldo para siempre; se ignora a proposito.
const STORAGE_KEY = 'sm_backend_respaldo_hasta';

// Tiempo que se usa el respaldo antes de volver a probar el principal.
const DURACION_RESPALDO_MS = 5 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class BackendFailoverService {
  private respaldoHasta = this.leer();

  constructor() {
    try { localStorage.removeItem('sm_backend_respaldo_activo'); } catch { /* sin storage */ }
  }

  usandoRespaldo(): boolean {
    if (this.respaldoHasta && Date.now() < this.respaldoHasta) return true;
    if (this.respaldoHasta) this.activarPrincipal();
    return false;
  }

  activarRespaldo() {
    this.respaldoHasta = Date.now() + DURACION_RESPALDO_MS;
    try { localStorage.setItem(STORAGE_KEY, String(this.respaldoHasta)); } catch { /* sin storage */ }
  }

  activarPrincipal() {
    this.respaldoHasta = 0;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* sin storage */ }
  }

  private leer(): number {
    try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; }
  }
}
