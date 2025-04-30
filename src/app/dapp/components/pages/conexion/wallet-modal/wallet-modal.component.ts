import { Component, EventEmitter, Input, Output } from "@angular/core"
import { CommonModule } from "@angular/common"
import { ActivatedRoute, Router } from "@angular/router"
import { WalletService } from "../../../../services/wallet.service"

@Component({
  selector: "app-wallet-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./wallet-modal.component.html",
  styleUrls: ["./wallet-modal.component.css"],
})
export class WalletModalComponent {
  @Input() blockchain = ""
  @Output() close = new EventEmitter<void>()
  @Output() selectWallet = new EventEmitter<string>()

  walletType = ""

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private walletService: WalletService,
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      this.walletType = params["type"] || ""
    })
  }

  goBack() {
    this.router.navigate(["/"])
  }

  async connectMetaMask() {
    try {
      localStorage.removeItem("walletConnected")
      await this.walletService.connect()

      // Intentar cambiar a Sepolia por defecto
      try {
        await this.walletService.switchNetwork("0xaa36a7") // Sepolia chainId
      } catch (networkError) {
        console.log("No se pudo cambiar a Sepolia, continuando con la red actual")
      }

      this.router.navigate(["/dashboard"])
    } catch (error) {
      console.error("Failed to connect to MetaMask:", error)
    }
  }
}
