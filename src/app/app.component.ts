import { WalletService } from './dapp/services/wallet.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {
  constructor(
    private walletService: WalletService,
    private router: Router
  ) { }

  async ngOnInit() {
    // Intentar reconectar automáticamente al iniciar la aplicación
    try {
      const isConnected = await this.walletService.autoReconnect();

      // Si el usuario está conectado y está en la página de inicio, redirigirlo al dashboard
      if (isConnected && this.router.url === '/') {
        console.log('Usuario reconectado automáticamente, redirigiendo al dashboard');
        this.router.navigate(['/dashboard']);
      }
    } catch (error) {
      console.error('Error al intentar reconectar automáticamente:', error);
    }
  }
}