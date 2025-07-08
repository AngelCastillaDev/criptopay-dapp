import { NavbarComponent } from "./../../common/navbar/navbar.component"
import { SidebarComponent } from "./../../common/sidebar/sidebar.component"
import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { RouterModule, Router } from "@angular/router"
import { WalletService } from "../../../services/wallet.service"
import { NotificationService } from "../../../services/notificacion.service"
import { HistoryService } from "../../../services/history.service"
import { ProcessedTransaction } from "../../../services/etherscan.service"
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

  balance = "0"
  network = "Desconocida"
  walletAddress = ""
  isLoadingBalance = false
  isLoadingTransactions = false

  private subscriptions: Subscription[] = []

  recentTransactions: RecentTransaction[] = []

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
        this.network = network
      }),
    )

    this.subscriptions.push(
      this.walletService.account$.subscribe((account) => {
        this.walletAddress = account || ""
      }),
    )

    // Suscribirse a las transacciones del HistoryService (se actualizan automáticamente)
    this.subscriptions.push(
      this.historyService.transactions$.subscribe((transactions) => {
        this.recentTransactions = transactions.slice(0, 3).map((tx) => this.mapTransactionToRecentFormat(tx))
        console.log("Dashboard: Recent transactions updated", this.recentTransactions.length)
      }),
    )

    this.subscriptions.push(
      this.historyService.isLoading$.subscribe((isLoading) => {
        this.isLoadingTransactions = isLoading
      }),
    )

    // Mostrar notificación de bienvenida
    setTimeout(() => {
      this.notificationService.showSuccess("¡Bienvenido a CriptoPay Dashboard!")
    }, 1000)
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub) => sub.unsubscribe())
    window.removeEventListener("resize", this.checkScreenSize.bind(this))
  }

  private mapTransactionToRecentFormat(tx: ProcessedTransaction): RecentTransaction {
    const date = tx.timestamp ? new Date(tx.timestamp) : new Date()

    return {
      id: tx.id,
      type: tx.type === "sent" ? "Enviado" : "Recibido",
      amount: `${tx.amount} ETH`,
      status: tx.status === "completed" ? "Completado" : "Fallido",
      date: date.toLocaleDateString(),
      from: tx.from_address,
      to: tx.to_address,
      hash: tx.hash,
      network: tx.network,
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
      console.log("Toggle mobile sidebar called")
    } else {
      console.error("Sidebar component not found or toggleSidebar method not available")
    }
  }

  closeDropdown() {
    const navbar = document.querySelector("app-navbar") as any
    if (navbar && navbar.closeDropdown) {
      navbar.closeDropdown()
    }
  }

  getTransactionIcon(type: string): string {
    return type === "Recibido"
      ? `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>`
      : `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>`
  }

  getTransactionColor(type: string): string {
    return type === "Recibido" ? "text-green-500" : "text-red-500"
  }

  async refreshBalance() {
    if (this.isLoadingBalance) return

    this.isLoadingBalance = true
    try {
      this.notificationService.showInfo("Actualizando datos...")

      // Actualizar balance
      await this.walletService.refreshBalance()

      // Actualizar transacciones (se hace automáticamente via HistoryService)
      await this.historyService.refreshTransactions()

      this.notificationService.showSuccess("Datos actualizados correctamente")
    } catch (error) {
      console.error("Error al actualizar los datos:", error)
      this.notificationService.showError("Error al actualizar los datos")
      this.isLoadingBalance = false
    }
  }

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

  formatAddress(address: string): string {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  goToHistory(): void {
    this.router.navigate(["/dashboard/history"])
  }

  openTransactionModal(transaction: RecentTransaction): void {
    this.selectedTransaction = transaction
    this.showTransactionModal = true
  }

  closeTransactionModal(): void {
    this.showTransactionModal = false
    this.selectedTransaction = null
  }

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

  viewOnEtherscan(hash: string): void {
    if (!hash) return

    let baseUrl = "https://etherscan.io/tx/"

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
