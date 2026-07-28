import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BackendFailoverService } from '../services/backend-failover.service';

// Tiempo maximo antes de considerar que el backend activo no responde.
// Debe ser generoso para no confundir un "cold start" normal de Render
// (el servicio dormido puede tardar hasta ~1 minuto en despertar) con una
// caida real por creditos agotados.
const TIMEOUT_MS = 90000;

function esErrorDeConexion(err: unknown): boolean {
  if (err instanceof HttpErrorResponse) {
    // status 0 = no hubo respuesta del servidor (servicio suspendido/caido)
    // 502/503/504 = el proxy de Render no encontro un servicio activo detras
    return err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504;
  }
  return false;
}

export const failoverInterceptor: HttpInterceptorFn = (req, next) => {
  const backupUrl = environment.apiUrlBackup;
  if (!backupUrl || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }

  const failover = inject(BackendFailoverService);
  // Solo los metodos idempotentes (GET/HEAD) se reintentan tambien por timeout puro;
  // en POST/PATCH/DELETE un timeout puede significar que el request SI se esta
  // procesando (solo lento), reintentarlo duplicaria la operacion. Ahi solo se
  // conmuta ante un error de conexion inequivoco (el backend nunca respondio).
  const metodoSeguro = req.method === 'GET' || req.method === 'HEAD';

  const reqPrincipal = req;
  const reqRespaldo = req.clone({ url: req.url.replace(environment.apiUrl, backupUrl) });

  const debeConmutar = (err: unknown) =>
    esErrorDeConexion(err) || (metodoSeguro && err instanceof TimeoutError);

  const intentar = (r: HttpRequest<unknown>, esRespaldo: boolean) =>
    next(r).pipe(
      timeout(TIMEOUT_MS),
      catchError((err) => {
        if (!debeConmutar(err)) return throwError(() => err);
        if (esRespaldo) {
          failover.activarPrincipal();
          return next(reqPrincipal).pipe(timeout(TIMEOUT_MS));
        }
        failover.activarRespaldo();
        return next(reqRespaldo).pipe(timeout(TIMEOUT_MS));
      }),
    );

  return failover.usandoRespaldo() ? intentar(reqRespaldo, true) : intentar(reqPrincipal, false);
};
