import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    children: [
      { path: 'dashboard', loadComponent: () => import('../dashboard/dashboard.page').then((m) => m.DashboardPage) },
      { path: 'ventas', loadComponent: () => import('../ventas/ventas.page').then((m) => m.VentasPage) },
      { path: 'ventas/nueva', loadComponent: () => import('../nueva-venta/nueva-venta.page').then((m) => m.NuevaVentaPage) },
      { path: 'ventas/editar/:id', loadComponent: () => import('../editar-venta/editar-venta.page').then((m) => m.EditarVentaPage) },
      { path: 'clientes', loadComponent: () => import('../clientes/clientes.page').then((m) => m.ClientesPage) },
      { path: 'inventario', loadComponent: () => import('../inventario/inventario.page').then((m) => m.InventarioPage) },
      { path: 'mas', loadComponent: () => import('../mas/mas.page').then((m) => m.MasPage) },
      { path: 'financiero', loadComponent: () => import('../financiero/financiero.page').then((m) => m.FinancieroPage) },
      { path: 'servicios', loadComponent: () => import('../servicios/servicios.page').then((m) => m.ServiciosPage) },
      { path: 'plataformas-report', loadComponent: () => import('../plataformas-report/plataformas-report.page').then((m) => m.PlataformasReportPage) },
      { path: 'usuarios', loadComponent: () => import('../usuarios/usuarios.page').then((m) => m.UsuariosPage) },
      { path: 'perfil', loadComponent: () => import('../perfil/perfil.page').then((m) => m.PerfilPage) },
      { path: '', redirectTo: '/tabs/dashboard', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: '/tabs/dashboard', pathMatch: 'full' },
];
