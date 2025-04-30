import { NotificationService } from './../../../services/notificacion.service';
import { Component,  OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule } from "@angular/router"
import  { WalletService, NetworkInfo } from "../../../services/wallet.service"
import { SidebarComponent } from "../../sidebar/sidebar.component"

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit {
  isMobile = false
  sidebarOpen = true
  network = ""
  chainId = ""
  showNetworkDropdown = false
  availableNetworks: NetworkInfo[] = []

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
  ) {
    this.walletService.network$.subscribe((network) => {
      this.network = network
    })

    this.walletService.chainId$.subscribe((chainId) => {
      this.chainId = chainId
    })
  }

  ngOnInit() {
    this.checkScreenSize()
    window.addEventListener("resize", this.checkScreenSize.bind(this))
    this.availableNetworks = this.walletService.availableNetworks

    // Verificar conexión al iniciar
    this.walletService.checkConnection()
  }

  checkScreenSize() {
    this.isMobile = window.innerWidth < 768
  }

  onSidebarToggled(open: boolean) {
    this.sidebarOpen = open
  }

  toggleMobileSidebar() {
    const sidebar = document.querySelector("app-sidebar") as any
    if (sidebar && sidebar.toggleSidebar) {
      sidebar.toggleSidebar()
    }
  }

  toggleNetworkDropdown(event: Event) {
    event.stopPropagation()
    this.showNetworkDropdown = !this.showNetworkDropdown
  }

  async switchNetwork(chainId: string, networkName: string) {
    try {
      await this.walletService.switchNetwork(chainId)
      this.showNetworkDropdown = false
      this.notificationService.showSuccess(`Red cambiada a ${networkName}`)
    } catch (error) {
      console.error("Error al cambiar de red:", error)
      this.notificationService.showError("Error al cambiar de red")
    }
  }

  // Cerrar el dropdown cuando se hace clic fuera
  closeDropdown() {
    this.showNetworkDropdown = false
  }

  // Obtener el icono de la red según su chainId
  getNetworkIcon(chainId: string): string {
    switch (chainId) {
      case "0x1": // Ethereum Mainnet
        return "ethereum"
      case "0xaa36a7": // Sepolia
        return "sepolia"
      case "0x5": // Goerli
        return "goerli"
      case "0x4268": // Holesky
        return "holesky"
      case "0x89": // Polygon
        return "polygon"
      case "0x13881": // Mumbai
        return "mumbai"
      default:
        return "unknown"
    }
  }
}
