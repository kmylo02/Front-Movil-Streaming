import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NavController } from '@ionic/angular/standalone';
import { Preferences } from '@capacitor/preferences';
import { firstValueFrom } from 'rxjs';
import { NativeBiometric } from 'capacitor-native-biometric';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;
const BIO_SERVER = 'streammanager.pro';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  username: string;
  rol: 'admin' | 'operador';
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  usuario = signal<UsuarioSesion | null>(null);
  private _token: string | null = null;
  private _initPromise: Promise<void>;

  constructor(private http: HttpClient, private navCtrl: NavController) {
    this._initPromise = this._loadFromStorage();
  }

  async init(): Promise<void> {
    return this._initPromise;
  }

  waitForInit(): Promise<void> {
    return this._initPromise;
  }

  private async _loadFromStorage(): Promise<void> {
    const timeout = new Promise<void>(r => setTimeout(r, 5000));
    const load = async () => {
      try {
        const { value: token } = await Preferences.get({ key: 'sm_token' });
        const { value: u } = await Preferences.get({ key: 'sm_usuario' });
        this._token = token;
        if (token && u) this.usuario.set(JSON.parse(u));
      } catch { /* ignore */ }
    };
    await Promise.race([load(), timeout]);
  }

  getToken(): string | null { return this._token; }
  isLoggedIn(): boolean { return !!this._token; }

  async login(username: string, password: string): Promise<void> {
    const resp = await firstValueFrom(
      this.http.post<{ access_token: string; usuario: UsuarioSesion }>(`${API}/auth/login`, { username, password })
    );
    this._token = resp.access_token;
    await Preferences.set({ key: 'sm_token', value: resp.access_token });
    await Preferences.set({ key: 'sm_usuario', value: JSON.stringify(resp.usuario) });
    this.usuario.set(resp.usuario);
  }

  async logout(): Promise<void> {
    this._token = null;
    await Preferences.remove({ key: 'sm_token' });
    await Preferences.remove({ key: 'sm_usuario' });
    this.usuario.set(null);
    this.navCtrl.navigateRoot('/login', { animationDirection: 'back' });
  }

  cambiarPassword(passwordActual: string, passwordNueva: string) {
    return this.http.put(`${API}/auth/me/password`, { passwordActual, passwordNueva });
  }

  // ── Biometric ──────────────────────────────────────────────────────────────

  async isBiometricAvailable(): Promise<boolean> {
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch { return false; }
  }

  async hasBiometricCredentials(): Promise<boolean> {
    try {
      const creds = await NativeBiometric.getCredentials({ server: BIO_SERVER });
      return !!creds?.username;
    } catch { return false; }
  }

  async loginWithBiometric(): Promise<void> {
    await NativeBiometric.verifyIdentity({
      reason: 'Confirma tu identidad para acceder',
      title: 'StreamManager Pro',
      subtitle: 'Acceso biométrico',
      description: 'Usa tu huella o Face ID',
    });
    const creds = await NativeBiometric.getCredentials({ server: BIO_SERVER });
    await this.login(creds.username, creds.password);
  }

  async saveBiometricCredentials(username: string, password: string): Promise<void> {
    await NativeBiometric.setCredentials({ username, password, server: BIO_SERVER });
  }

  async deleteBiometricCredentials(): Promise<void> {
    try { await NativeBiometric.deleteCredentials({ server: BIO_SERVER }); } catch { /* ignore */ }
  }

  async setBiometricEnabled(enabled: boolean, username?: string, password?: string): Promise<void> {
    if (enabled && username && password) {
      await this.saveBiometricCredentials(username, password);
    } else {
      await this.deleteBiometricCredentials();
    }
    await Preferences.set({ key: 'sm_bio_enabled', value: enabled ? '1' : '0' });
  }

  async isBiometricEnabled(): Promise<boolean> {
    const { value } = await Preferences.get({ key: 'sm_bio_enabled' });
    return value === '1';
  }
}
