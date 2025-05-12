import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of, switchMap, take, tap } from 'rxjs';
import { WalletService } from '../services/wallet.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  
  constructor(private walletService: WalletService, private router: Router) {}
  
  canActivate(): Observable<boolean> {
    // Primero verificamos si estamos comprobando la conexión
    return this.walletService.isCheckingConnection$.pipe(
      take(1),
      switchMap(isChecking => {
        // Si estamos comprobando la conexión, esperamos a que termine
        if (isChecking) {
          console.log("AuthGuard: Waiting for connection check to complete");
          // Esperamos a que isCheckingConnection sea false
          return this.walletService.isCheckingConnection$.pipe(
            take(1),
            switchMap(stillChecking => {
              if (!stillChecking) {
                return this.checkIsConnected();
              }
              return of(false);
            })
          );
        } else {
          // Si no estamos comprobando la conexión, verificamos directamente
          return this.checkIsConnected();
        }
      })
    );
  }
  
  private checkIsConnected(): Observable<boolean> {
    return this.walletService.isConnected$.pipe(
      take(1),
      tap(isConnected => {
        console.log("AuthGuard: User is connected:", isConnected);
        if (!isConnected) {
          console.log("AuthGuard: Redirecting to landing page");
          this.router.navigate(['/']);
        }
      })
    );
  }
}