import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Subscription } from "rxjs"
import { WalletService } from "./../../../../services/wallet.service"
import { HistoryService, TransactionHistory } from "./../../../../services/history.service"
import { NotificationService } from "./../../../../services/notificacion.service"

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
  filteredTransactions: Transaction[] = []
  currentFilter: "all" | "sent" | "received" = "all"
  currentWallet = ""
  isLoading = false
  searchTerm = ""
  currentNetwork = ""
  showTransactionDetails: string | null = null

  private walletSubscription: Subscription | null = null
  private networkSubscription: Subscription | null = null

  constructor(
    private walletService: WalletService,
    private historyService: HistoryService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    // Suscribirse a cambios en la wallet
    this.walletSubscription = this.walletService.account$.subscribe((wallet) => {
      this.currentWallet = wallet
      if (wallet) {
        this.loadTransactions()
      }
    })

    // Suscribirse a cambios en la red
    this.networkSubscription = this.walletService.network$.subscribe((network) => {
      this.currentNetwork = network
    })
  }

  ngOnDestroy(): void {
    // Limpiar suscripciones
    if (this.walletSubscription) {
      this.walletSubscription.unsubscribe()
    }
    if (this.networkSubscription) {
      this.networkSubscription.unsubscribe()
    }
  }

  // Modificar la función loadTransactions para usar el nuevo servicio y manejar el campo type
  async loadTransactions(): Promise<void> {
    this.isLoading = true

    try {
      if (this.currentWallet) {
        // Cargar desde el servicio
        const historyData = await this.historyService.listHistory(this.currentWallet)

        // Transformar los datos
        this.transactions = historyData.map((item) => {
          // Determinar el tipo de transacción basado en el campo type o en las direcciones
          const transactionType =
            item.type || (item.from_address.toLowerCase() === this.currentWallet.toLowerCase() ? "sent" : "received")

          // Determinar la dirección a mostrar basada en el tipo de transacción
          const displayAddress = transactionType === "sent" ? item.to_address : item.from_address

          return {
            id: item.id || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: transactionType,
            amount: item.amount.toString(),
            address: displayAddress,
            timestamp: item.timestamp ? new Date(item.timestamp) : new Date(),
            status: "completed",
            hash: item.tx_hash,
            note: item.note,
          }
        })

        // Aplicar filtro actual
        this.applyFilters()
      }
    } catch (error) {
      console.error("Error al cargar transacciones:", error)
      this.notificationService.showError("Error al cargar el historial de transacciones")
    } finally {
      this.isLoading = false
    }
  }

  // Agregar una función para determinar el tipo de transacción si no viene en los datos
  private determineTransactionType(history: TransactionHistory): "sent" | "received" {
    return history.from_address.toLowerCase() === this.currentWallet.toLowerCase() ? "sent" : "received"
  }

  // Filtrar transacciones
  filterTransactions(filter: "all" | "sent" | "received"): void {
    this.currentFilter = filter
    this.applyFilters()

    // Cerrar cualquier detalle abierto al cambiar de filtro
    this.showTransactionDetails = null
  }

  // Aplicar filtros (tipo y búsqueda)
  applyFilters(): void {
    let filtered = [...this.transactions]

    // Filtrar por tipo
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((tx) => tx.type === this.currentFilter)
    }

    // Filtrar por término de búsqueda
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase()
      filtered = filtered.filter(
        (tx) =>
          tx.address.toLowerCase().includes(term) ||
          tx.hash.toLowerCase().includes(term) ||
          (tx.note && tx.note.toLowerCase().includes(term)),
      )
    }

    this.filteredTransactions = filtered
  }

  // Buscar transacciones
  search(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value
    this.applyFilters()

    // Cerrar cualquier detalle abierto al buscar
    this.showTransactionDetails = null
  }

  // Mostrar/ocultar detalles de una transacción
  toggleTransactionDetails(txId: string): void {
    if (this.showTransactionDetails === txId) {
      this.showTransactionDetails = null
    } else {
      this.showTransactionDetails = txId

      // Hacer scroll suave hacia el elemento expandido
      setTimeout(() => {
        const element = document.getElementById(`tx-details-${txId}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" })
        }
      }, 100)
    }
  }

  // Copiar hash de transacción
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

  // Ver transacción en Etherscan
  viewOnEtherscan(hash: string, event: Event): void {
    event.stopPropagation()
    let baseUrl = "https://etherscan.io/tx/"

    // Ajustar URL según la red
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

  // Formatear dirección para mostrar
  formatAddress(address: string): string {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Refrescar lista de transacciones
  refreshTransactions(): void {
    // Cerrar cualquier detalle abierto al refrescar
    this.showTransactionDetails = null
    this.loadTransactions()
  }
}
