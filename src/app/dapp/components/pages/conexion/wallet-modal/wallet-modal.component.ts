import { LoadingModalComponent } from './../LoadingModal/loading-modal.component';
import { Component, EventEmitter, Input, Output } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute, Router } from "@angular/router"
import { WalletService } from "../../../../services/wallet.service"
import { NotificationService } from "../../../../services/notificacion.service"

@Component({
  selector: "app-wallet-modal",
  standalone: true,
  imports: [CommonModule, LoadingModalComponent],
  templateUrl: "./wallet-modal.component.html",
  styleUrls: ["./wallet-modal.component.css"],
})
export class WalletModalComponent {
  @Input() blockchain = ""
  @Output() close = new EventEmitter<void>()
  @Output() selectWallet = new EventEmitter<string>()

  walletType = ""
  isLoading = false
  errorMessage = ""

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletService: WalletService,
    private notificationService: NotificationService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.walletType = params["type"] || ""
    })
  }

  async connectMetaMask() {
    this.isLoading = true
    this.errorMessage = ""

    try {
      // Clear any previous connection
      localStorage.removeItem("walletConnected")

      // Connect to MetaMask - this will trigger the permission popup
      // The loading modal will be shown while waiting for user to approve
      await this.walletService.connect()

      // No intentamos cambiar a Sepolia automáticamente
      // Dejamos que el usuario elija la red que desee

      // Show success notification
      this.notificationService.showSuccess("Conectado exitosamente a MetaMask")

      // Forzar actualización del balance
      setTimeout(() => {
        this.walletService.refreshBalance();
      }, 1000);

      // Navigate to dashboard on successful connection
      this.router.navigate(["/dashboard"])
    } catch (error: any) {
      console.error("Failed to connect to MetaMask:", error)
      this.errorMessage = error.message || "Error al conectar con MetaMask"
      this.notificationService.showError(this.errorMessage)
    } finally {
      this.isLoading = false
    }
  }
}