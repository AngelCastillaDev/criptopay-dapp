import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Subscription } from "rxjs"
import { WalletService } from "./../../../../services/wallet.service"
import { ContactService, Contact } from "./../../../../services/contact.service"
import { HistoryService } from "./../../../../services/history.service"
import { NotificationService } from "./../../../../services/notificacion.service"
import { parseEther, parseUnits, Contract } from "ethers"
import contractAbi from "../../../../abi/transaction.json"

@Component({
  selector: "app-transaction",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./transaction.component.html",
  styleUrls: ["./transaction.component.css"],
})
export class TransactionComponent implements OnInit, OnDestroy {
  // Datos de la transacción
  recipientAddress = ""
  amount = ""
  gasPrice = "5" // Valor predeterminado para gas (gwei)
  note = ""

  // Nuevo: Tipo de transacción y dirección del contrato
  transactionType: "normal" | "contract" = "normal"
  contractAddress = ""

  // Mapeo de direcciones de contrato por red
  contractAddresses: { [key: string]: string } = {
    Ethereum: "0x1234567890123456789012345678901234567890", // Ejemplo para mainnet
    Sepolia: "0xABCDEF1234567890123456789012345678901234", // Ejemplo para Sepolia
    Goerli: "0x9876543210987654321098765432109876543210", // Ejemplo para Goerli
    Holesky: "0x5678901234567890123456789012345678901234", // Ejemplo para Holesky
    Polygon: "0x3456789012345678901234567890123456789012", // Ejemplo para Polygon
    Mumbai: "0x7890123456789012345678901234567890123456", // Ejemplo para Mumbai
  }

  // Estado de la UI
  isLoading = false
  showModal = false
  showSuccessModal = false
  errorMessage = ""
  transactionHash = ""

  // Datos del usuario
  currentWallet = ""
  currentNetwork = ""
  contacts: Contact[] = []
  filteredContacts: Contact[] = []
  showContactsList = false
  searchContactTerm = ""

  // Suscripciones
  private walletSubscription: Subscription | null = null
  private networkSubscription: Subscription | null = null

  constructor(
    private walletService: WalletService,
    private contactService: ContactService,
    private historyService: HistoryService,
    private notificationService: NotificationService,
  ) { }

  // Método para seleccionar el tipo de transacción con animación
  selectTransactionType(type: "normal" | "contract"): void {
    this.transactionType = type

    // Mostrar notificación informativa según el tipo seleccionado
    if (type === "normal") {
      this.notificationService.showInfo("Modo de transferencia normal seleccionado", 3000)
    } else {
      if (this.contractAddress) {
        this.notificationService.showInfo(
          `Modo de Smart Contract seleccionado. Usando contrato en ${this.currentNetwork}`,
          3000,
        )
      } else {
        this.notificationService.showError(`No hay contrato disponible para la red ${this.currentNetwork}`, 3000)
      }
    }
  }

  ngOnInit(): void {
    // Suscribirse a cambios en la wallet
    this.walletSubscription = this.walletService.account$.subscribe((wallet) => {
      this.currentWallet = wallet
      if (wallet) {
        this.loadContacts()
      }
    })

    // Suscribirse a cambios en la red
    this.networkSubscription = this.walletService.network$.subscribe((network) => {
      this.currentNetwork = network
      // Actualizar la dirección del contrato cuando cambia la red
      this.updateContractAddress()
    })
  }

  // Actualizar la dirección del contrato según la red actual
  updateContractAddress(): void {
    const prevAddress = this.contractAddress
    this.contractAddress = this.contractAddresses[this.currentNetwork] || ""

    // Si estamos en modo contrato y cambia la dirección, notificar al usuario
    if (this.transactionType === "contract") {
      if (this.contractAddress) {
        if (prevAddress !== this.contractAddress) {
          this.notificationService.showInfo(`Contrato actualizado para red ${this.currentNetwork}`, 3000)
        }
      } else {
        this.notificationService.showError(`No hay contrato disponible para la red ${this.currentNetwork}`, 3000)
      }
    }

    console.log(`Dirección del contrato para ${this.currentNetwork}: ${this.contractAddress}`)
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

  // Cargar contactos del usuario
  async loadContacts(): Promise<void> {
    try {
      if (this.currentWallet) {
        this.contacts = await this.contactService.listContacts(this.currentWallet)
        this.filteredContacts = [...this.contacts]
      }
    } catch (error) {
      console.error("Error al cargar contactos:", error)
    }
  }

  // Filtrar contactos según el término de búsqueda
  filterContacts(): void {
    if (!this.searchContactTerm.trim()) {
      this.filteredContacts = [...this.contacts]
      return
    }

    const term = this.searchContactTerm.toLowerCase()
    this.filteredContacts = this.contacts.filter(
      (contact) =>
        (contact.name && contact.name.toLowerCase().includes(term)) ||
        contact.wallet_address.toLowerCase().includes(term),
    )
  }

  // Manejar cambios en el campo de búsqueda
  onSearchContactChange(event: Event): void {
    this.searchContactTerm = (event.target as HTMLInputElement).value

    // Si el usuario está ingresando una dirección directamente, actualizar recipientAddress
    if (this.searchContactTerm.startsWith("0x") && this.searchContactTerm.length === 42) {
      this.recipientAddress = this.searchContactTerm
    } else {
      // Si no es una dirección completa, filtrar contactos normalmente
      this.filterContacts()
    }

    this.showContactsList = true
  }

  // Seleccionar un contacto
  selectContact(contact: Contact): void {
    this.recipientAddress = contact.wallet_address
    this.searchContactTerm = contact.name || this.formatAddress(contact.wallet_address)
    this.showContactsList = false
  }

  // Formatear dirección para mostrar
  formatAddress(address: string): string {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Validar el formulario antes de mostrar el modal
  validateForm(): boolean {
    // Resetear mensaje de error
    this.errorMessage = ""

    // Validar dirección - Verificar que sea una dirección Ethereum válida
    if (!this.recipientAddress) {
      // Si el usuario ingresó texto en el campo de búsqueda pero no seleccionó un contacto
      if (this.searchContactTerm && this.searchContactTerm.startsWith("0x") && this.searchContactTerm.length === 42) {
        // Usar la dirección ingresada directamente
        this.recipientAddress = this.searchContactTerm
      } else {
        this.errorMessage = "Por favor, ingresa una dirección de wallet válida"
        return false
      }
    }

    // Verificar formato de dirección Ethereum
    if (!this.recipientAddress.startsWith("0x") || this.recipientAddress.length !== 42) {
      this.errorMessage = "Por favor, ingresa una dirección de wallet Ethereum válida (formato 0x...)"
      return false
    }

    // Validar cantidad
    if (!this.amount || Number.parseFloat(this.amount) <= 0) {
      this.errorMessage = "Por favor, ingresa una cantidad válida"
      return false
    }

    // Validar gas
    if (!this.gasPrice || Number.parseFloat(this.gasPrice) <= 0) {
      this.errorMessage = "Por favor, ingresa un precio de gas válido"
      return false
    }

    // Validar dirección del contrato si se usa el modo contrato
    if (this.transactionType === "contract" && !this.contractAddress) {
      this.errorMessage = "No hay dirección de contrato disponible para la red actual"
      return false
    }

    return true
  }

  // Abrir modal de confirmación
  openConfirmModal(): void {
    if (this.validateForm()) {
      this.showModal = true
    }
  }

  // Cerrar modal
  closeModal(): void {
    this.showModal = false
  }

  // Modificar el método closeSuccessModal para mostrar notificación
  closeSuccessModal(): void {
    this.showSuccessModal = false
    this.resetForm()
    this.notificationService.showInfo("Puedes realizar otra transacción", 3000)
  }

  // Resetear formulario
  resetForm(): void {
    this.recipientAddress = ""
    this.searchContactTerm = ""
    this.amount = ""
    this.gasPrice = "5"
    this.note = ""
    this.transactionHash = ""
    this.transactionType = "normal"
  }

  // Modificar el método sendTransaction para mostrar notificaciones
  async sendTransaction(): Promise<void> {
    this.isLoading = true
    this.errorMessage = ""

    try {
      const provider = this.walletService.getProvider()
      if (!provider) throw new Error("No se pudo obtener el proveedor de wallet")

      const signer = await provider.getSigner()
      let transaction

      if (this.transactionType === "normal") {
        // Transferencia normal
        const tx = {
          to: this.recipientAddress.trim().toLowerCase(),
          value: parseEther(this.amount),
          gasPrice: parseUnits(this.gasPrice, "gwei"),
        }

        transaction = await signer.sendTransaction(tx)
      } else {
        // Transferencia usando contrato
        if (!this.contractAddress) {
          throw new Error("No hay dirección de contrato disponible para la red actual")
        }

        // Crear instancia del contrato
        const contract = new Contract(this.contractAddress, contractAbi, signer)

        // Llamar a la función sendPayment del contrato
        transaction = await contract['sendPayment'](this.recipientAddress.trim().toLowerCase(), {
          value: parseEther(this.amount),
          gasPrice: parseUnits(this.gasPrice, "gwei"),
        })
      }

      this.transactionHash = transaction.hash
      this.showModal = false

      // Mostrar notificación de transacción enviada
      this.notificationService.showSuccess("¡Transacción enviada correctamente!", 5000)

      // ✅ Intenta esperar confirmación, pero no lo obligues
      try {
        await transaction.wait()
        // Mostrar notificación de transacción confirmada
        this.notificationService.showSuccess("¡Transacción confirmada en la blockchain!", 5000)
      } catch (err) {
        console.warn("⚠️ No se pudo confirmar vía wait():", err)
        // Aquí puedes esperar 5 segundos y reintentar si quieres
        await new Promise((res) => setTimeout(res, 5000))
        try {
          await transaction.wait()
          this.notificationService.showSuccess("¡Transacción confirmada en la blockchain!", 5000)
        } catch (finalErr) {
          console.warn("❌ Segundo intento fallido, pero continuamos")
          this.notificationService.showInfo("Transacción enviada, pero aún no confirmada", 5000)
        }
      }

      // ✅ Guarda el historial de ambas partes
      await this.saveToHistory(transaction.hash, this.currentWallet, this.recipientAddress)
      await this.saveToHistory(transaction.hash, this.recipientAddress, this.currentWallet, true)

      this.showSuccessModal = true
      await this.walletService.refreshBalance()
    } catch (error: any) {
      console.error("Error al enviar la transacción:", error)
      this.errorMessage = error.message || "Error al enviar la transacción"
      this.showModal = false
      this.notificationService.showError(`Error: ${this.errorMessage}`, 5000)
    } finally {
      this.isLoading = false
    }
  }

  // Guardar transacción en el historial
  async saveToHistory(
    txHash: string,
    ownerWallet: string,
    counterpartyWallet: string,
    isReceived = false,
  ): Promise<void> {
    try {
      // Determinar el tipo de transacción de manera explícita
      const transactionType: "received" | "sent" = isReceived ? "received" : "sent"

      // Crear el objeto de historial con todos los campos necesarios
      const historyEntry = {
        tx_hash: txHash,
        from_address: isReceived ? counterpartyWallet : ownerWallet,
        to_address: isReceived ? ownerWallet : counterpartyWallet,
        amount: Number.parseFloat(this.amount),
        note: this.note || undefined,
        owner_wallet: ownerWallet,
        timestamp: new Date().toISOString(),
        type: transactionType, // Asegurarse de que el tipo esté explícitamente definido
      }

      // Guardar en el historial
      await this.historyService.addHistory(historyEntry)

      console.log(`Transacción guardada para ${ownerWallet} como ${transactionType}`)
    } catch (error) {
      console.error("Error al guardar en el historial:", error)
    }
  }

  // Copiar hash de transacción
  copyTransactionHash(): void {
    navigator.clipboard
      .writeText(this.transactionHash)
      .then(() => {
        // Feedback visual temporal
        const button = document.getElementById("copy-button")
        if (button) {
          button.textContent = "¡Copiado!"
          setTimeout(() => {
            button.textContent = "Copiar Hash"
          }, 2000)
        }
      })
      .catch((err) => console.error("Error al copiar:", err))
  }

  // Ver transacción en Etherscan
  viewOnEtherscan(): void {
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

    window.open(baseUrl + this.transactionHash, "_blank")
  }

  // Mostrar lista de contactos al hacer clic en el campo
  onRecipientFocus(): void {
    this.showContactsList = true
  }

  // Ocultar lista de contactos cuando se hace clic fuera
  onClickOutside(event: Event): void {
    if (!(event.target as HTMLElement).closest(".contact-search-container")) {
      this.showContactsList = false
    }
  }
}
