import { Injectable } from "@angular/core"
import { CanActivate, Router } from "@angular/router"
import { WalletService } from "../services/wallet.service"
import { map, take } from "rxjs/operators"

@Injectable({
  providedIn: "root",
})
export class AuthGuard implements CanActivate {
  constructor(
    private walletService: WalletService,
    private router: Router,
  ) { }

  canActivate() {
    return this.walletService.isConnected$.pipe(
      take(1),
      map((isConnected) => {
        if (isConnected) {
          return true
        } else {
          this.router.navigate([""])
          return false
        }
      }),
    )
  }
}
