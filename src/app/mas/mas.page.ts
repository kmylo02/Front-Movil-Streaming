import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  statsChartOutline, tvOutline, analyticsOutline, peopleCircleOutline,
  personCircleOutline, chevronForwardOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-mas',
  standalone: true,
  imports: [CommonModule, RouterModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonIcon, IonLabel, IonNote],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Más</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <div class="user-header">
        <div class="user-avatar">{{ inicial() }}</div>
        <div>
          <div class="user-name">{{ auth.usuario()?.nombre }}</div>
          <div class="user-role">{{ auth.usuario()?.rol }}</div>
        </div>
      </div>

      <ion-list class="menu-list">
        <div class="group-label">Reportes</div>
        <ion-item routerLink="/tabs/financiero" detail="true" button>
          <ion-icon name="stats-chart-outline" slot="start" class="ic-v"></ion-icon>
          <ion-label>Financiero</ion-label>
          <ion-note slot="end">Ingresos y gastos</ion-note>
        </ion-item>
        <ion-item routerLink="/tabs/plataformas-report" detail="true" button>
          <ion-icon name="analytics-outline" slot="start" class="ic-f"></ion-icon>
          <ion-label>Por Plataforma</ion-label>
          <ion-note slot="end">Análisis y combos</ion-note>
        </ion-item>

        <div class="group-label">Configuración</div>
        <ion-item routerLink="/tabs/servicios" detail="true" button>
          <ion-icon name="tv-outline" slot="start" class="ic-a"></ion-icon>
          <ion-label>Plataformas</ion-label>
          <ion-note slot="end">Catálogo de servicios</ion-note>
        </ion-item>
        @if (auth.usuario()?.rol === 'admin') {
          <ion-item routerLink="/tabs/usuarios" detail="true" button>
            <ion-icon name="people-circle-outline" slot="start" class="ic-e"></ion-icon>
            <ion-label>Usuarios</ion-label>
            <ion-note slot="end">Gestión de acceso</ion-note>
          </ion-item>
        }
        <ion-item routerLink="/tabs/perfil" detail="true" button>
          <ion-icon name="person-circle-outline" slot="start" class="ic-v"></ion-icon>
          <ion-label>Mi Perfil</ion-label>
          <ion-note slot="end">Cuenta y seguridad</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  styles: [`
    .user-header {
      display: flex; align-items: center; gap: 14px;
      padding: 24px 20px 20px;
    }
    .user-avatar {
      width: 52px; height: 52px; border-radius: 15px;
      background: linear-gradient(135deg, #7c3aed, #c026d3);
      display: flex; align-items: center; justify-content: center;
      font-size: 22px; font-weight: 800; color: #fff;
      flex-shrink: 0;
    }
    .user-name { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #f1f5f9; }
    .user-role { font-size: 12px; color: rgba(241,245,249,0.45); text-transform: capitalize; margin-top: 2px; }
    .menu-list { padding: 0 16px; background: transparent; }
    .group-label {
      font-size: 11px; font-weight: 700; letter-spacing: 0.08em;
      text-transform: uppercase; color: rgba(241,245,249,0.3);
      padding: 20px 16px 8px;
    }
    ion-item { --border-radius: 12px; margin-bottom: 6px; --background: rgba(255,255,255,0.04); --border-color: transparent; }
    ion-note { font-size: 11px; color: rgba(241,245,249,0.3); }
    .ic-v { color: #a78bfa; }
    .ic-f { color: #e879f9; }
    .ic-a { color: #f59e0b; }
    .ic-e { color: #10b981; }
  `],
})
export class MasPage {
  constructor(public auth: AuthService) {
    addIcons({ statsChartOutline, tvOutline, analyticsOutline, peopleCircleOutline, personCircleOutline, chevronForwardOutline });
  }
  inicial(): string { return this.auth.usuario()?.nombre?.charAt(0).toUpperCase() || 'A'; }
}
