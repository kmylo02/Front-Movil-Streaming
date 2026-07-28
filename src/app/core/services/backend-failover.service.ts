import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'sm_backend_respaldo_activo';

@Injectable({ providedIn: 'root' })
export class BackendFailoverService {
  private activo = signal<boolean>(localStorage.getItem(STORAGE_KEY) === '1');

  usandoRespaldo(): boolean {
    return this.activo();
  }

  activarRespaldo() {
    if (!this.activo()) {
      this.activo.set(true);
      localStorage.setItem(STORAGE_KEY, '1');
    }
  }

  activarPrincipal() {
    if (this.activo()) {
      this.activo.set(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}
