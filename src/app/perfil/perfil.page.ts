import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
  IonCard, IonCardContent, IonItem, IonLabel, IonInput, IonToggle,
  IonSpinner, NavController, AlertController, LoadingController, ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline, lockClosedOutline, fingerPrintOutline, logOutOutline,
  checkmarkOutline, eyeOutline, eyeOffOutline,
} from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonIcon,
    IonCard, IonCardContent, IonItem, IonLabel, IonInput, IonToggle,
    IonSpinner,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="navCtrl.back()"><ion-icon name="chevron-back-outline"></ion-icon></ion-button>
        </ion-buttons>
        <ion-title>Mi Perfil</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- User info -->
      <div class="profile-header">
        <div class="profile-avatar">{{ inicial() }}</div>
        <div>
          <div class="profile-name">{{ auth.usuario()?.nombre }}</div>
          <div class="profile-username">@{{ auth.usuario()?.username }}</div>
          <div class="profile-role">{{ auth.usuario()?.rol }}</div>
        </div>
      </div>

      <!-- Password change -->
      <ion-card class="section-card">
        <ion-card-content>
          <div class="section-title">Cambiar contraseña</div>
          @if (passError()) { <div class="error-banner">{{ passError() }}</div> }
          @if (passOk()) { <div class="ok-banner">Contraseña actualizada</div> }

          <ion-item class="f-item" lines="none">
            <ion-label position="stacked">Contraseña actual</ion-label>
            <ion-input [(ngModel)]="passActual" [type]="showOld() ? 'text' : 'password'" placeholder="••••••"></ion-input>
            <ion-button slot="end" fill="clear" (click)="showOld.set(!showOld())">
              <ion-icon [name]="showOld() ? 'eye-off-outline' : 'eye-outline'" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-item>
          <ion-item class="f-item" lines="none">
            <ion-label position="stacked">Nueva contraseña</ion-label>
            <ion-input [(ngModel)]="passNueva" [type]="showNew() ? 'text' : 'password'" placeholder="••••••"></ion-input>
            <ion-button slot="end" fill="clear" (click)="showNew.set(!showNew())">
              <ion-icon [name]="showNew() ? 'eye-off-outline' : 'eye-outline'" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-item>
          <ion-item class="f-item" lines="none">
            <ion-label position="stacked">Confirmar contraseña</ion-label>
            <ion-input [(ngModel)]="passConfirm" type="password" placeholder="••••••"></ion-input>
          </ion-item>
          <ion-button expand="block" (click)="cambiarPassword()" [disabled]="savingPass()" class="btn-save">
            @if (savingPass()) { <ion-spinner name="crescent" slot="start"></ion-spinner> }
            @else { <ion-icon name="checkmark-outline" slot="start"></ion-icon> }
            Actualizar contraseña
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Biometric -->
      @if (bioAvailable()) {
        <ion-card class="section-card">
          <ion-card-content>
            <div class="section-title">Seguridad biométrica</div>
            <ion-item class="f-item bio-item" lines="none">
              <ion-icon name="finger-print-outline" slot="start" style="color:#a78bfa"></ion-icon>
              <ion-label>Acceso con huella</ion-label>
              <ion-toggle [(ngModel)]="bioEnabled" (ngModelChange)="toggleBiometric($event)" slot="end"></ion-toggle>
            </ion-item>
            <p class="bio-desc">Usa tu huella dactilar o Face ID para acceder sin contraseña</p>
          </ion-card-content>
        </ion-card>
      }

      <!-- Logout -->
      <div class="logout-wrap">
        <ion-button expand="block" color="danger" fill="outline" (click)="logout()" class="btn-logout">
          <ion-icon name="log-out-outline" slot="start"></ion-icon>
          Cerrar sesión
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: [`
    .profile-header { display:flex; align-items:center; gap:16px; padding:24px 20px 20px; }
    .profile-avatar {
      width:60px; height:60px; border-radius:17px; flex-shrink:0;
      background:linear-gradient(135deg,#7c3aed,#c026d3);
      display:flex; align-items:center; justify-content:center;
      font-size:24px; font-weight:800; color:#fff;
      box-shadow:0 8px 24px rgba(124,58,237,0.3);
    }
    .profile-name { font-size:18px; font-weight:800; letter-spacing:-0.02em; color:#f1f5f9; }
    .profile-username { font-size:13px; color:rgba(241,245,249,0.5); margin-top:2px; }
    .profile-role { font-size:11px; color:#a78bfa; margin-top:3px; font-weight:600; text-transform:capitalize; }
    .section-card { margin:6px 16px; }
    .section-title { font-size:13px; font-weight:700; color:rgba(241,245,249,0.6); margin-bottom:12px; }
    .f-item { --background:rgba(255,255,255,0.05); --border-radius:10px; border:1px solid rgba(255,255,255,0.08); border-radius:10px; margin-bottom:8px; }
    .bio-item { margin-bottom:0; }
    .bio-desc { font-size:12px; color:rgba(241,245,249,0.35); margin-top:10px; line-height:1.5; }
    .error-banner { background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.25); color:#f43f5e; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px; }
    .ok-banner { background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.25); color:#10b981; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px; }
    .btn-save { --background:rgba(124,58,237,0.15); --border-radius:12px; --color:#a78bfa; font-weight:700; margin-top:4px; }
    .logout-wrap { padding:12px 16px 40px; }
    .btn-logout { --border-radius:12px; font-weight:700; }
  `],
})
export class PerfilPage implements OnInit {
  passActual = '';
  passNueva = '';
  passConfirm = '';
  savingPass = signal(false);
  passError = signal('');
  passOk = signal(false);
  showOld = signal(false);
  showNew = signal(false);
  bioAvailable = signal(false);
  bioEnabled = false;

  constructor(
    public auth: AuthService,
    public navCtrl: NavController,
    private alertCtrl: AlertController,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
  ) {
    addIcons({ chevronBackOutline, lockClosedOutline, fingerPrintOutline, logOutOutline, checkmarkOutline, eyeOutline, eyeOffOutline });
  }

  async ngOnInit() {
    const avail = await this.auth.isBiometricAvailable();
    this.bioAvailable.set(avail);
    if (avail) this.bioEnabled = await this.auth.isBiometricEnabled();
  }

  inicial(): string { return this.auth.usuario()?.nombre?.charAt(0).toUpperCase() || 'A'; }

  async cambiarPassword() {
    if (!this.passActual || !this.passNueva || !this.passConfirm) {
      this.passError.set('Todos los campos son obligatorios');
      return;
    }
    if (this.passNueva !== this.passConfirm) {
      this.passError.set('Las contraseñas no coinciden');
      return;
    }
    this.savingPass.set(true);
    this.passError.set('');
    this.passOk.set(false);
    try {
      await new Promise<void>((res, rej) => {
        this.auth.cambiarPassword(this.passActual, this.passNueva).subscribe({ next: () => res(), error: rej });
      });
      this.passOk.set(true);
      this.passActual = '';
      this.passNueva = '';
      this.passConfirm = '';
    } catch (e: any) {
      this.passError.set(e?.error?.message || 'No pudimos cambiar la contraseña. Inténtalo de nuevo.');
    } finally { this.savingPass.set(false); }
  }

  async toggleBiometric(enabled: boolean) {
    if (!enabled) {
      await this.auth.setBiometricEnabled(false);
      const t = await this.toastCtrl.create({ message: 'Huella digital desactivada', duration: 2000, color: 'dark' });
      t.present();
      return;
    }
    const alert = await this.alertCtrl.create({
      header: 'Activar acceso con huella',
      message: 'Confirma tu contraseña una vez para guardar tus credenciales de forma segura en este dispositivo.',
      inputs: [{ name: 'pass', type: 'password', placeholder: 'Contraseña' }],
      buttons: [
        { text: 'Cancelar', role: 'cancel', handler: () => { this.bioEnabled = false; } },
        {
          text: 'Activar',
          handler: async (data) => {
            try {
              await this.auth.setBiometricEnabled(true, this.auth.usuario()!.username, data.pass);
              const t = await this.toastCtrl.create({ message: 'Huella digital activada ✅', duration: 2000, color: 'success' });
              t.present();
            } catch { this.bioEnabled = false; }
          },
        },
      ],
    });
    await alert.present();
  }

  async logout() {
    const alert = await this.alertCtrl.create({
      header: 'Cerrar sesión',
      message: 'Tendrás que volver a iniciar sesión la próxima vez que abras la app. ¿Quieres salir ahora?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sí, salir', role: 'destructive', handler: async () => {
          await this.auth.logout();
          this.navCtrl.navigateRoot('/login');
        }},
      ],
    });
    await alert.present();
  }
}
