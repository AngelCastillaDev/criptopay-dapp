import { WalletModalComponent } from "../conexion/wallet-modal/wallet-modal.component"
import { LoginModalComponent } from "../conexion/login-modal/login-modal.component"
import { Component, OnInit, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-landing-page",
  standalone: true,
  imports: [CommonModule, LoginModalComponent, WalletModalComponent],
  templateUrl: "./landing-page.component.html",
  styleUrls: ["./landing-page.component.css"],
})
export class LandingPageComponent implements OnInit {
  showLoginModal = false
  showWalletModal = false
  selectedBlockchain = ""

  ngOnInit() {
    // Inicialización del componente
    this.checkScreenSize()
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Detectar cambios en el tamaño de la pantalla para ajustes responsivos
    this.checkScreenSize()
  }

  checkScreenSize() {
    // Lógica para ajustes responsivos si es necesario
    const isMobile = window.innerWidth < 768
    // Puedes usar esta variable para ajustes específicos si es necesario
  }

  onSelectBlockchain(blockchain: string) {
    this.selectedBlockchain = blockchain
    this.showLoginModal = false

    if (blockchain === "ethereum") {
      setTimeout(() => {
        this.showWalletModal = true
      }, 300)
    }
  }

  onSelectWallet(wallet: string) {
    console.log(`Selected wallet: ${wallet}`)
    this.showWalletModal = false
    // Aquí iría la lógica para conectar con la wallet seleccionada
  }
}
