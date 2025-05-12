import { NavbarComponent } from "./../../common/navbar/navbar.component"
import { SidebarComponent } from "./../../common/sidebar/sidebar.component"
import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule, Router } from "@angular/router"
import { WalletService } from "../../../services/wallet.service"
import { NotificationService } from "../../../services/notificacion.service"
import { HistoryService, TransactionHistory } from "../../../services/history.service"
import { Subscription } from "rxjs"

interface RecentTransaction {
  id: string
  type: "Recibido" | "Enviado"
  amount: string
  status: string
  date: string
  from: string
  to: string
  hash: string
  network?: string
}

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent, NavbarComponent],
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.css"],
})
export class DashboardComponent implements OnInit, OnDestroy {
  isMobile = false
  sidebarOpen = true

  // Datos para el dashboard
  balance = "0"
  network = "Desconocida"
  walletAddress = ""
  isLoadingBalance = false
  isLoadingTransactions = false

  // Suscripciones
  private subscriptions: Subscription[] = []

  // Transacciones recientes (limitadas a 3)
  recentTransactions: RecentTransaction[] = []

  // Modal de detalles de transacción
  showTransactionModal = false
  selectedTransaction: RecentTransaction | null = null

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
    private historyService: HistoryService,
    public router: Router,
  ) { }

  ngOnInit() {
    this.checkScreenSize()
    window.addEventListener("resize", this.checkScreenSize.bind(this))

    // Suscribirse a los datos de la wallet
    this.subscriptions.push(
      this.walletService.balance$.subscribe((balance) => {
        this.balance = balance
        this.isLoadingBalance = false
        console.log("Dashboard: Balance updated to", balance)
      }),
    )

    this.subscriptions.push(
      this.walletService.network$.subscribe((network) => {
        console.log("Dashboard: Network updated to", network)
        // Cuando cambia la red, establecer isLoadingBalance a true
        // para mostrar el indicador de carga
        this.isLoadingBalance = true
        this.network = network

        // Intentar actualizar el balance después de un cambio de red
        setTimeout(() => {
          this.walletService.refreshBalance()
        }, 1000)
      }),
    )

    this.subscriptions.push(
      this.walletService.account$.subscribe((account) => {
        this.walletAddress = account || ""

        // Cargar transacciones recientes cuando cambia la wallet
        if (account) {
          this.loadRecentTransactions()
        }
      }),
    )

    // Configurar listener para eventos de cambio de red en MetaMask
    if (window.ethereum) {
      window.ethereum.on("chainChanged", () => {
        console.log("Dashboard detected chain change")
        this.isLoadingBalance = true
      })
    }

    // Mostrar notificación de bienvenida
    setTimeout(() => {
      this.notificationService.showSuccess("¡Bienvenido a CriptoPay Dashboard!")
    }, 1000)
  }

  ngOnDestroy() {
    // Cancelar todas las suscripciones para evitar memory leaks
    this.subscriptions.forEach((sub) => sub.unsubscribe())

    // Eliminar el event listener de resize
    window.removeEventListener("resize", this.checkScreenSize.bind(this))

    // Eliminar listeners de MetaMask
    if (window.ethereum) {
      window.ethereum.removeAllListeners("chainChanged")
    }
  }

  // Cargar las transacciones recientes (limitadas a 3)
  async loadRecentTransactions() {
    if (!this.walletAddress) return

    this.isLoadingTransactions = true

    try {
      // Obtener todas las transacciones
      const transactions = await this.historyService.listHistory(this.walletAddress)

      // Mapear y limitar a las 3 más recientes
      this.recentTransactions = transactions
        .slice(0, 3) // Tomar solo las primeras 3
        .map((tx) => this.mapTransactionToRecentFormat(tx))
    } catch (error) {
      console.error("Error al cargar transacciones recientes:", error)
    } finally {
      this.isLoadingTransactions = false
    }
  }

  // Mapear transacción del historial al formato de transacción reciente
  private mapTransactionToRecentFormat(tx: TransactionHistory): RecentTransaction {
    const isSent = tx.from_address.toLowerCase() === this.walletAddress.toLowerCase()
    const date = tx.timestamp ? new Date(tx.timestamp) : new Date()

    return {
      id: tx.id || "",
      type: isSent ? "Enviado" : "Recibido",
      amount: `${tx.amount} ETH`,
      status: "Completado",
      date: date.toLocaleDateString(),
      from: tx.from_address,
      to: tx.to_address,
      hash: tx.tx_hash,
      network: this.network,
    }
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
      console.log("Toggle mobile sidebar called") // Para depuración
    } else {
      console.error("Sidebar component not found or toggleSidebar method not available")
    }
  }

  closeDropdown() {
    // Este método se usa para cerrar dropdowns cuando se hace clic fuera
    const navbar = document.querySelector("app-navbar") as any
    if (navbar && navbar.closeDropdown) {
      navbar.closeDropdown()
    }
  }

  // Método para obtener el icono según el tipo de transacción
  getTransactionIcon(type: string): string {
    return type === "Recibido"
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>`
  }

  // Método para obtener el color según el tipo de transacción
  getTransactionColor(type: string): string {
    return type === "Recibido" ? "text-green-500" : "text-red-500"
  }

  // Método para forzar la actualización del balance
  async refreshBalance() {
    if (this.isLoadingBalance) return

    this.isLoadingBalance = true
    try {
      this.notificationService.showInfo("Actualizando balance...")
      await this.walletService.refreshBalance()
      this.notificationService.showSuccess("Balance actualizado correctamente")

      // También actualizar las transacciones recientes
      this.loadRecentTransactions()
    } catch (error) {
      console.error("Error al actualizar el balance:", error)
      this.notificationService.showError("Error al actualizar el balance")
      this.isLoadingBalance = false
    }
  }

  // Método para copiar la dirección de la wallet
  copyAddress() {
    if (!this.walletAddress) {
      this.notificationService.showError("No hay dirección para copiar")
      return
    }

    navigator.clipboard
      .writeText(this.walletAddress)
      .then(() => {
        this.notificationService.showSuccess("Dirección copiada al portapapeles")
      })
      .catch((err) => {
        console.error("Error al copiar la dirección:", err)
        this.notificationService.showError("Error al copiar la dirección")
      })
  }

  // Formatear dirección para mostrar
  formatAddress(address: string): string {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Navegar a la página de historial
  goToHistory(): void {
    this.router.navigate(["/dashboard/history"])
  }

  // Abrir modal con detalles de la transacción
  openTransactionModal(transaction: RecentTransaction): void {
    this.selectedTransaction = transaction
    this.showTransactionModal = true
  }

  // Cerrar modal de detalles
  closeTransactionModal(): void {
    this.showTransactionModal = false
    this.selectedTransaction = null
  }

  // Copiar hash de transacción
  copyTransactionHash(hash: string): void {
    if (!hash) return

    navigator.clipboard
      .writeText(hash)
      .then(() => {
        this.notificationService.showSuccess("Hash copiado al portapapeles")
      })
      .catch((err) => {
        console.error("Error al copiar el hash:", err)
        this.notificationService.showError("Error al copiar el hash")
      })
  }

  // Ver transacción en Etherscan
  viewOnEtherscan(hash: string): void {
    if (!hash) return

    let baseUrl = "https://etherscan.io/tx/"

    // Ajustar URL según la red
    switch (this.network) {
      case "Sepolia":
        baseUrl = "https://sepolia.etherscan.io/tx/"
        break
      case "Goerli":
        baseUrl = "https://goerli.etherscan.io/tx/"
        break
      case "Holesky":
        baseUrl = "https://holesky.etherscan.io/tx/"
        break
      case "Polygon":
        baseUrl = "https://polygonscan.com/tx/"
        break
      case "Mumbai":
        baseUrl = "https://mumbai.polygonscan.com/tx/"
        break
    }

    window.open(baseUrl + hash, "_blank")
  }
}
