import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavController,
  IonContent, IonButton, IonIcon, IonSpinner, IonInput, IonItem, IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline, fingerPrintOutline, playOutline, logInOutline } from 'ionicons/icons';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonButton, IonIcon, IonSpinner, IonInput, IonItem, IonLabel],
  template: `
    <ion-content>
      <div class="login-root">
        <div class="logo-wrap">
          <div class="logo-mark">▶</div>
          <h1 class="logo-title">StreamManager<span class="logo-sub"> Pro</span></h1>
          <p class="logo-desc">Gestión profesional de streaming</p>
        </div>

        <div class="form-card">
          @if (error()) {
            <div class="error-banner">{{ error() }}</div>
          }

          <ion-item class="field-item" lines="none">
            <ion-label position="stacked" class="field-label">Usuario</ion-label>
            <ion-input
              [(ngModel)]="username"
              type="text"
              placeholder="Ingresa tu usuario"
              autocomplete="username"
              [disabled]="loading()"
              class="field-input">
            </ion-input>
          </ion-item>

          <ion-item class="field-item" lines="none">
            <ion-label position="stacked" class="field-label">Contraseña</ion-label>
            <ion-input
              [(ngModel)]="password"
              [type]="showPass() ? 'text' : 'password'"
              placeholder="••••••••"
              autocomplete="current-password"
              [disabled]="loading()"
              class="field-input">
            </ion-input>
            <ion-button slot="end" fill="clear" (click)="showPass.set(!showPass())" class="eye-btn">
              <ion-icon [name]="showPass() ? 'eye-off-outline' : 'eye-outline'" slot="icon-only"></ion-icon>
            </ion-button>
          </ion-item>

          <ion-button expand="block" (click)="login()" [disabled]="loading()" class="btn-primary-action">
            @if (loading()) { <ion-spinner name="crescent" slot="start"></ion-spinner> }
            @else { <ion-icon name="log-in-outline" slot="start"></ion-icon> }
            Ingresar
          </ion-button>

          @if (biometricReady()) {
            <div class="divider-row">
              <div class="divider-line"></div><span class="divider-text">o</span><div class="divider-line"></div>
            </div>
            <ion-button expand="block" fill="outline" (click)="loginBio()" [disabled]="loading()" class="btn-bio">
              <ion-icon name="finger-print-outline" slot="start"></ion-icon>
              Acceder con huella
            </ion-button>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-content { --background: #06060f; }
    .login-root {
      min-height: 100vh; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 32px 24px;
      background: radial-gradient(ellipse at 60% 0%, rgba(124,58,237,0.15) 0%, transparent 60%),
                  radial-gradient(ellipse at 30% 100%, rgba(192,38,211,0.08) 0%, transparent 50%),
                  #06060f;
    }
    .logo-wrap { text-align: center; margin-bottom: 40px; }
    .logo-mark {
      width: 64px; height: 64px; border-radius: 18px; margin: 0 auto 16px;
      background: linear-gradient(135deg, #7c3aed, #c026d3);
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 900; color: #fff;
      box-shadow: 0 12px 40px rgba(124,58,237,0.4);
    }
    .logo-title { font-size: 24px; font-weight: 900; letter-spacing: -0.03em; color: #f1f5f9; margin: 0 0 6px; }
    .logo-sub { background: linear-gradient(135deg, #a78bfa, #e879f9); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .logo-desc { font-size: 13px; color: rgba(241,245,249,0.4); margin: 0; }
    .form-card {
      width: 100%; max-width: 360px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px; padding: 24px 20px;
    }
    .error-banner {
      background: rgba(244,63,94,0.12); border: 1px solid rgba(244,63,94,0.25);
      color: #f43f5e; border-radius: 10px; padding: 10px 14px;
      font-size: 13px; margin-bottom: 16px;
    }
    .field-item {
      --background: rgba(255,255,255,0.06);
      --border-radius: 10px;
      --padding-start: 14px;
      --inner-padding-end: 0;
      border: 1px solid rgba(255,255,255,0.09);
      border-radius: 10px; margin-bottom: 12px;
    }
    .field-label { font-size: 12px !important; font-weight: 600; color: rgba(241,245,249,0.5) !important; margin-bottom: 2px; }
    .field-input { font-size: 15px; --color: #f1f5f9; }
    .eye-btn { --color: rgba(241,245,249,0.4); }
    .btn-primary-action {
      --background: linear-gradient(135deg, #7c3aed, #c026d3);
      --border-radius: 12px; font-weight: 700; margin-top: 8px;
      --box-shadow: 0 4px 20px rgba(124,58,237,0.4);
    }
    .divider-row { display: flex; align-items: center; gap: 10px; margin: 16px 0; }
    .divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
    .divider-text { font-size: 12px; color: rgba(241,245,249,0.3); }
    .btn-bio {
      --border-radius: 12px; --border-color: rgba(124,58,237,0.4);
      --color: #a78bfa; font-weight: 600;
    }
  `],
})
export class LoginPage implements OnInit {
  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  showPass = signal(false);
  biometricReady = signal(false);

  constructor(private auth: AuthService, private navCtrl: NavController) {
    addIcons({ eyeOutline, eyeOffOutline, fingerPrintOutline, playOutline, logInOutline });
  }

  async ngOnInit() {
    const available = await this.auth.isBiometricAvailable();
    if (available) {
      const hasCreds = await this.auth.hasBiometricCredentials();
      this.biometricReady.set(hasCreds);
    }
  }

  async login() {
    if (!this.username.trim() || !this.password) {
      this.error.set('Ingresa usuario y contraseña');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.username.trim(), this.password);
      const bioAvailable = await this.auth.isBiometricAvailable();
      if (bioAvailable && !(await this.auth.hasBiometricCredentials())) {
        await this.auth.saveBiometricCredentials(this.username.trim(), this.password);
        await this.auth.setBiometricEnabled(true);
      }
      this.navCtrl.navigateRoot('/tabs/dashboard');
    } catch (e: any) {
      if (e?.status === 0) {
        this.error.set('Sin conexión al servidor. Verifica tu internet.');
      } else if (e?.status === 401) {
        this.error.set(e?.error?.message || 'Usuario o contraseña incorrectos');
      } else {
        this.error.set(e?.error?.message || e?.message || `Error ${e?.status || 'desconocido'}`);
      }
    } finally {
      this.loading.set(false);
    }
  }

  async loginBio() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.loginWithBiometric();
      this.navCtrl.navigateRoot('/tabs/dashboard');
    } catch (e: any) {
      if (e?.code !== 'BIOMETRIC_DISMISSED') {
        this.error.set('No se pudo verificar la identidad');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
