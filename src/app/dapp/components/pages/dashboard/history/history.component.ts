import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Subscription } from "rxjs"
import { WalletService } from "./../../../../services/wallet.service"
import { HistoryService } from "./../../../../services/history.service"
import { NotificationService } from "./../../../../services/notificacion.service"
import { ProcessedTransaction } from "./../../../../services/etherscan.service"

interface Transaction {
  id: string
  type: "sent" | "received"
  amount: string
  address: string
  timestamp: Date
  status: "pending" | "completed" | "failed"
  hash: string
  note?: string
}

@Component({
  selector: "app-history",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./history.component.html",
  styleUrls: ["./history.component.css"],
})
export class HistoryComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = []
  currentFilter: "all" | "sent" | "received" = "all"
  currentWallet = ""
  isLoading = false
  searchTerm = ""
  currentNetwork = ""
  showTransactionDetails: string | null = null

  // Propiedades de paginación
  currentPage = 1
  totalPages = 1
  totalItems = 0
  filteredItems = 0
  itemsPerPage = 10

  // Opciones para elementos por página
  itemsPerPageOptions = [5, 10, 20, 50]

  private subscriptions: Subscription[] = []

  constructor(
    private walletService: WalletService,
    private historyService: HistoryService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    // Suscribirse a cambios en la wallet
    this.subscriptions.push(
      this.walletService.account$.subscribe((wallet) => {
        this.currentWallet = wallet
        console.log("History: Wallet changed to", wallet)
      }),
    )

    // Suscribirse a cambios en la red
    this.subscriptions.push(
      this.walletService.network$.subscribe((network) => {
        this.currentNetwork = network
        console.log("History: Network changed to", network)
      }),
    )

    // Suscribirse a las transacciones PAGINADAS (las que se muestran)
    this.subscriptions.push(
      this.historyService.transactions$.subscribe((transactions) => {
        console.log("History: Paginated transactions updated", transactions.length)
        this.transactions = this.mapProcessedTransactions(transactions)
      }),
    )

    // Suscribirse al estado de carga
    this.subscriptions.push(
      this.historyService.isLoading$.subscribe((isLoading) => {
        this.isLoading = isLoading
        console.log("History: Loading state changed to", isLoading)
      }),
    )

    // Suscribirse a los filtros actuales
    this.subscriptions.push(
      this.historyService.currentFilter$.subscribe((filter) => {
        this.currentFilter = filter
        console.log("History: Filter changed to", filter)
      }),
    )

    this.subscriptions.push(
      this.historyService.searchTerm$.subscribe((searchTerm) => {
        this.searchTerm = searchTerm
        console.log("History: Search term changed to", searchTerm)
      }),
    )

    // Suscribirse a la paginación
    this.subscriptions.push(
      this.historyService.currentPage$.subscribe((page) => {
        this.currentPage = page
        console.log("History: Current page changed to", page)
      }),
    )

    this.subscriptions.push(
      this.historyService.totalPages$.subscribe((pages) => {
        this.totalPages = pages
        console.log("History: Total pages changed to", pages)
      }),
    )

    this.subscriptions.push(
      this.historyService.itemsPerPage$.subscribe((itemsPerPage) => {
        this.itemsPerPage = itemsPerPage
        console.log("History: Items per page changed to", itemsPerPage)
      }),
    )

    // Suscribirse a las transacciones filtradas para obtener el total
    this.subscriptions.push(
      this.historyService.filteredTransactions$.subscribe((filtered) => {
        this.filteredItems = filtered.length
        console.log("History: Filtered items count", this.filteredItems)
      }),
    )

    // Suscribirse a todas las transacciones para obtener el total general
    this.subscriptions.push(
      this.historyService.allTransactions$.subscribe((all) => {
        this.totalItems = all.length
        console.log("History: Total items count", this.totalItems)
      }),
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe())
  }

  private mapProcessedTransactions(processedTx: ProcessedTransaction[]): Transaction[] {
    return processedTx.map((tx) => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      address: tx.address,
      timestamp: tx.timestamp,
      status: tx.status as "completed" | "failed",
      hash: tx.hash,
      note: undefined,
    }))
  }

  // Cambiar filtro por tipo
  filterTransactions(filter: "all" | "sent" | "received"): void {
    console.log("User clicked filter:", filter)
    this.historyService.setFilter(filter)
    this.showTransactionDetails = null
  }

  // Buscar transacciones
  search(event: Event): void {
    const searchTerm = (event.target as HTMLInputElement).value
    console.log("User searched:", searchTerm)
    this.historyService.setSearchTerm(searchTerm)
    this.showTransactionDetails = null
  }

  toggleTransactionDetails(txId: string): void {
    if (this.showTransactionDetails === txId) {
      this.showTransactionDetails = null
    } else {
      this.showTransactionDetails = txId

      setTimeout(() => {
        const element = document.getElementById(`tx-details-${txId}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    }
  }

  copyTransactionHash(hash: string, event: Event): void {
    event.stopPropagation()
    navigator.clipboard
      .writeText(hash)
      .then(() => {
        this.notificationService.showSuccess("Hash copiado al portapapeles")
      })
      .catch((err) => {
        console.error("Error al copiar:", err)
        this.notificationService.showError("Error al copiar el hash")
      })
  }

  viewOnEtherscan(hash: string, event: Event): void {
    event.stopPropagation()
    let baseUrl = "https://etherscan.io/tx/"

    switch (this.currentNetwork) {
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

  formatAddress(address: string): string {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  async refreshTransactions(): Promise<void> {
    this.showTransactionDetails = null

    try {
      await this.historyService.refreshTransactions()
      this.notificationService.showSuccess("Transacciones actualizadas")
    } catch (error) {
      console.error("Error refreshing transactions:", error)
      this.notificationService.showError("Error al actualizar las transacciones")
    }
  }

  // Métodos de paginación
  goToPage(page: number): void {
    this.historyService.goToPage(page)
    this.showTransactionDetails = null
  }

  goToFirstPage(): void {
    this.goToPage(1)
  }

  goToLastPage(): void {
    this.goToPage(this.totalPages)
  }

  goToPreviousPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1)
    }
  }

  goToNextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1)
    }
  }

  onItemsPerPageChange(event: Event): void {
    const select = event.target as HTMLSelectElement
    const itemsPerPage = Number.parseInt(select.value, 10)
    this.historyService.setItemsPerPage(itemsPerPage)
    this.showTransactionDetails = null
  }

  // Generar array de números de página para mostrar
  getPageNumbers(): number[] {
    const pages: number[] = []
    const maxPagesToShow = 5
    const halfRange = Math.floor(maxPagesToShow / 2)

    let startPage = Math.max(1, this.currentPage - halfRange)
    let endPage = Math.min(this.totalPages, this.currentPage + halfRange)

    // Ajustar si estamos cerca del inicio o final
    if (endPage - startPage + 1 < maxPagesToShow) {
      if (startPage === 1) {
        endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1)
      } else {
        startPage = Math.max(1, endPage - maxPagesToShow + 1)
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  }

  // Obtener rango de elementos mostrados (considerando filtros)
  getItemRange(): string {
    if (this.filteredItems === 0) return "0 de 0"

    const start = (this.currentPage - 1) * this.itemsPerPage + 1
    const end = Math.min(this.currentPage * this.itemsPerPage, this.filteredItems)

    return `${start}-${end} de ${this.filteredItems}`
  }

  // Obtener texto descriptivo del filtro actual
  getFilterDescription(): string {
    if (this.searchTerm.trim()) {
      const filterText =
        this.currentFilter === "all" ? "todas" : this.currentFilter === "sent" ? "enviadas" : "recibidas"
      return `Buscando "${this.searchTerm}" en transacciones ${filterText}`
    }

    switch (this.currentFilter) {
      case "sent":
        return "Mostrando transacciones enviadas"
      case "received":
        return "Mostrando transacciones recibidas"
      default:
        return "Mostrando todas las transacciones"
    }
  }
}
