import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class VentaEventsService {
  ventaCambiada$ = new Subject<void>();
  notificar() { this.ventaCambiada$.next(); }
}
