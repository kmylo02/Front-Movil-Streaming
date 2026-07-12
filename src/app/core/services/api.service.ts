import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

// ─── Models ────────────────────────────────────────────────────────────────

export interface Cliente {
  _id: string;
  nombre: string;
  telefono: string;
  whatsapp?: string;
  email?: string;
  notas?: string;
  activo: boolean;
  createdAt: string;
}

export interface ServicioAsignado {
  servicioId: string;
  nombreServicio: string;
  cuentaId: string;
  emailCuenta: string;
  claveCuenta: string;
  numeroPerfil: number;
  clavePerfil?: string;
}

export interface Venta {
  _id: string;
  clienteId: string;
  nombreCliente: string;
  servicios: ServicioAsignado[];
  fechaInicio: string;
  fechaVencimiento: string;
  duracionMeses: number;
  monto: number;
  estado: 'activa' | 'por_vencer' | 'vencida' | 'pausada';
  mensajeGenerado: string;
  notas?: string;
  createdAt: string;
}

export interface Perfil {
  numero: number;
  clavePerfil?: string;
  ocupado: boolean;
  ventaId?: string;
  clienteNombre?: string;
}

export interface Cuenta {
  _id: string;
  servicioId: string;
  nombreServicio: string;
  email: string;
  clave: string;
  tipo: 'compartida' | 'individual';
  totalPerfiles: number;
  perfiles: Perfil[];
  activa: boolean;
  notas?: string;
  operadorNombre?: string;
  fechaInicioCuenta?: string;
  fechaVencimientoCuenta?: string;
  renovable?: boolean;
  valorCuenta?: number;
  valorPantalla?: number;
}

export interface Servicio {
  _id: string;
  nombre: string;
  color: string;
  icono: string;
  activo: boolean;
  requiereClavePerfil: boolean;
  requiereNumeroPerfil: boolean;
  precio?: number;
  perfilesPorCuenta?: number;
}

export interface Dashboard {
  ventasMes: number;
  totalActivas: number;
  totalVencidas: number;
  proximasAVencer: number;
  ingresosMes: number;
  ventasPorServicio: { _id: string; cantidad: number }[];
  ingresosMensuales: { _id: { mes: number; anio: number }; ingresos: number; cantidad: number }[];
  alertas: { id: string; cliente: string; vence: string; servicios: string }[];
}

export interface Usuario {
  _id: string;
  nombre: string;
  username: string;
  rol: 'admin' | 'operador';
  activo: boolean;
  createdAt: string;
}

export interface PlataformaStats {
  nombre: string;
  icono: string;
  color: string;
  totalActivas: number;
}

export interface PlataformaReporteCliente {
  clienteId: string;
  nombreCliente: string;
  monto: number;
  diasRestantes: number | null;
}

export interface ComboStats {
  nombres: string[];
  cantidad: number;
}

export interface UpsellCliente {
  clienteId: string;
  nombreCliente: string;
  serviciosSugeridos: string[];
}

export interface PlataformasReport {
  totalActivas: number;
  ingresosMes: number;
  proximasAVencer: number;
  clientes: PlataformaReporteCliente[];
  combos: ComboStats[];
  posiblesUpsells: UpsellCliente[];
}

export interface FinancieroMes {
  mes: string;
  ingresos: number;
  gastos: number;
  ganancia: number;
}

export interface MovimientoCliente {
  clienteId: string;
  nombreCliente: string;
  totalMonto: number;
  cantidadVentas: number;
  servicios: string[];
  pct: number;
}

export interface MovimientosMes {
  mes: number;
  anio: number;
  totalMes: number;
  clientes: MovimientoCliente[];
}

// ─── Services ──────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ClientesApiService {
  constructor(private http: HttpClient) {}
  getAll(busqueda?: string) {
    let params = new HttpParams();
    if (busqueda) params = params.set('busqueda', busqueda);
    return this.http.get<Cliente[]>(`${API}/clientes`, { params });
  }
  create(dto: Partial<Cliente>) { return this.http.post<Cliente>(`${API}/clientes`, dto); }
  update(id: string, dto: Partial<Cliente>) { return this.http.patch<Cliente>(`${API}/clientes/${id}`, dto); }
  delete(id: string) { return this.http.delete(`${API}/clientes/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class VentasApiService {
  constructor(private http: HttpClient) {}
  getAll(filtros?: { estado?: string; mes?: number; anio?: number; clienteId?: string }) {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.mes) params = params.set('mes', filtros.mes.toString());
    if (filtros?.anio) params = params.set('anio', filtros.anio.toString());
    if (filtros?.clienteId) params = params.set('clienteId', filtros.clienteId);
    return this.http.get<Venta[]>(`${API}/ventas`, { params });
  }
  getOne(id: string) { return this.http.get<Venta>(`${API}/ventas/${id}`); }
  create(dto: any) { return this.http.post<Venta>(`${API}/ventas`, dto); }
  update(id: string, dto: any) { return this.http.patch<Venta>(`${API}/ventas/${id}`, dto); }
  renovar(id: string, duracionMeses: number, monto: number) {
    return this.http.patch<Venta>(`${API}/ventas/${id}/renovar`, { duracionMeses, monto });
  }
  cancelar(id: string) { return this.http.patch<Venta>(`${API}/ventas/${id}/cancelar`, {}); }
  pausar(id: string) { return this.http.patch<Venta>(`${API}/ventas/${id}/pausar`, {}); }
  eliminar(id: string) { return this.http.delete(`${API}/ventas/${id}`); }
  proximosAVencer(dias = 7) {
    return this.http.get<Venta[]>(`${API}/ventas/proximos-a-vencer`, { params: { dias: dias.toString() } });
  }
}

@Injectable({ providedIn: 'root' })
export class InventarioApiService {
  constructor(private http: HttpClient) {}
  getAll(filtros?: { conDisponibles?: boolean }) {
    let params = new HttpParams();
    if (filtros?.conDisponibles) params = params.set('conDisponibles', 'true');
    return this.http.get<Cuenta[]>(`${API}/inventario`, { params });
  }
  getResumen() { return this.http.get<Record<string, any>>(`${API}/inventario/resumen`); }
  getDisponibles(nombreServicio: string) {
    return this.http.get<any[]>(`${API}/inventario/disponibles/${nombreServicio}`);
  }
  create(dto: any) { return this.http.post<Cuenta>(`${API}/inventario`, dto); }
  update(id: string, dto: any) { return this.http.patch<Cuenta>(`${API}/inventario/${id}`, dto); }
  toggle(id: string) { return this.http.patch<Cuenta>(`${API}/inventario/${id}/toggle`, {}); }
  delete(id: string) { return this.http.delete(`${API}/inventario/${id}`); }
  getClientesAfectados(id: string) { return this.http.get<any[]>(`${API}/inventario/${id}/clientes-afectados`); }
}

@Injectable({ providedIn: 'root' })
export class ServiciosApiService {
  constructor(private http: HttpClient) {}
  getAll(todos = false) {
    let params = new HttpParams();
    if (todos) params = params.set('todos', 'true');
    return this.http.get<Servicio[]>(`${API}/servicios`, { params });
  }
  create(dto: Partial<Servicio>) { return this.http.post<Servicio>(`${API}/servicios`, dto); }
  update(id: string, dto: Partial<Servicio>) { return this.http.patch<Servicio>(`${API}/servicios/${id}`, dto); }
  delete(id: string) { return this.http.delete(`${API}/servicios/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class UsuariosApiService {
  constructor(private http: HttpClient) {}
  getAll() { return this.http.get<Usuario[]>(`${API}/auth/usuarios`); }
  create(dto: { nombre: string; username: string; password: string; rol: string }) {
    return this.http.post<Usuario>(`${API}/auth/usuarios`, dto);
  }
  update(id: string, dto: { nombre?: string; username?: string; rol?: string }) {
    return this.http.patch<Usuario>(`${API}/auth/usuarios/${id}`, dto);
  }
  toggle(id: string, solicitanteId: string) {
    return this.http.patch<Usuario>(`${API}/auth/usuarios/${id}/toggle`, { solicitanteId });
  }
  resetPassword(id: string, nuevaPassword: string) {
    return this.http.patch(`${API}/auth/usuarios/${id}/reset-password`, { nuevaPassword });
  }
  delete(id: string, solicitanteId: string) {
    return this.http.delete(`${API}/auth/usuarios/${id}`, { body: { solicitanteId } });
  }
}

@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  constructor(private http: HttpClient) {}
  getDashboard() { return this.http.get<Dashboard>(`${API}/reports/dashboard`); }
  getVentasMensuales(anio?: number) {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<any[]>(`${API}/reports/ventas-mensuales`, { params });
  }
  getMovimientosMes(mes?: number, anio?: number) {
    let params = new HttpParams();
    if (mes) params = params.set('mes', mes.toString());
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<MovimientosMes>(`${API}/reports/movimientos-mes`, { params });
  }
  getFinanciero(anio?: number) {
    let params = new HttpParams();
    if (anio) params = params.set('anio', anio.toString());
    return this.http.get<FinancieroMes[]>(`${API}/reports/financiero`, { params });
  }
  getPlataformasStats() {
    return this.http.get<PlataformaStats[]>(`${API}/reports/plataformas/stats`);
  }
  getPlataformaReport(nombre: string) {
    return this.http.get<PlataformasReport>(`${API}/reports/plataformas/${encodeURIComponent(nombre)}`);
  }
}
