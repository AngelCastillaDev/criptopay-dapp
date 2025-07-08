import { NotificationService } from './../../../../services/notificacion.service';
import { HistoryService } from './../../../../services/history.service';
import { WalletService } from './../../../../services/wallet.service';
import { Component, OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Subscription } from "rxjs"
import { ContactService, Contact } from "../../../../services/contact.service"
import { parseEther, parseUnits, formatEther } from "ethers"

@Component({
  selector: "app-transaction",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./transaction.component.html",
  styleUrls: ["./transaction.component.css"],
})
export class TransactionComponent implements OnInit, OnDestroy {
  // Modo actual de la aplicación
  currentMode: "normal" | "contract" | "manage" = "normal"

  // Datos de transacción normal
  recipientAddress = ""
  amount = ""
  gasPrice = "5"
  note = ""

  // Datos de Smart Contract
  contractAddress = ""
  contractBalance = "0"
  contractAmount = ""
  contractRecipient = ""
  contractGasPrice = "5"

  // Datos de gestión de contratos
  manageContractAddress = ""
  manageContractBalance = "0"
  depositAmount = ""
  depositGasPrice = "5"

  // Estado de la UI
  isLoading = false
  isLoadingContract = false
  isLoadingManage = false
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
  private subscriptions: Subscription[] = []

  constructor(
    private walletService: WalletService,
    private contactService: ContactService,
    private historyService: HistoryService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    // Suscribirse a cambios en la wallet
    this.subscriptions.push(
      this.walletService.account$.subscribe((wallet) => {
        this.currentWallet = wallet
        if (wallet) {
          this.loadContacts()
        }
      }),
    )

    // Suscribirse a cambios en la red
    this.subscriptions.push(
      this.walletService.network$.subscribe((network) => {
        this.currentNetwork = network
      }),
    )

    // Suscribirse a cambios en el contrato
    this.subscriptions.push(
      this.walletService.contractBalance$.subscribe((balance) => {
        this.contractBalance = balance
      }),
    )

    this.subscriptions.push(
      this.walletService.contractAddress$.subscribe((address) => {
        this.contractAddress = address
      }),
    )
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe())
  }

  // Cambiar modo de la aplicación
  selectMode(mode: "normal" | "contract" | "manage"): void {
    this.currentMode = mode
    this.resetForms()

    switch (mode) {
      case "normal":
        this.notificationService.showInfo("Modo de transferencia normal seleccionado")
        break
      case "contract":
        this.notificationService.showInfo("Modo Smart Contract seleccionado")
        break
      case "manage":
        this.notificationService.showInfo("Modo gestión de contratos seleccionado")
        break
    }
  }

  // Resetear formularios
  resetForms(): void {
    this.recipientAddress = ""
    this.amount = ""
    this.contractAmount = ""
    this.contractRecipient = ""
    this.depositAmount = ""
    this.searchContactTerm = ""
    this.errorMessage = ""
    this.showContactsList = false
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

    if (this.searchContactTerm.startsWith("0x") && this.searchContactTerm.length === 42) {
      if (this.currentMode === "normal") {
        this.recipientAddress = this.searchContactTerm
      } else if (this.currentMode === "contract") {
        this.contractRecipient = this.searchContactTerm
      }
    } else {
      this.filterContacts()
    }

    this.showContactsList = true
  }

  // Seleccionar un contacto
  selectContact(contact: Contact): void {
    if (this.currentMode === "normal") {
      this.recipientAddress = contact.wallet_address
    } else if (this.currentMode === "contract") {
      this.contractRecipient = contact.wallet_address
    }

    this.searchContactTerm = contact.name || this.formatAddress(contact.wallet_address)
    this.showContactsList = false
  }

  // Formatear dirección para mostrar
  formatAddress(address: string): string {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // ===== MÉTODOS PARA SMART CONTRACTS =====

  // Cargar balance del contrato
  async loadContractBalance(): Promise<void> {
    if (!this.contractAddress) {
      this.notificationService.showError("Por favor, ingresa una dirección de contrato")
      return
    }

    if (!this.contractAddress.startsWith("0x") || this.contractAddress.length !== 42) {
      this.notificationService.showError("Por favor, ingresa una dirección de contrato válida")
      return
    }
    this.isLoadingContract = true
    this.contractBalance = "0"
    
    try {
      const isValid = await this.walletService.isValidContract(this.contractAddress)
      if (!isValid) {
        throw new Error("La dirección no es un contrato válido")
      }

      // Verificar si el contrato tiene el método sendPayment
      const hasPaymentMethod = await this.walletService.hasPaymentMethod(this.contractAddress)
      if (!hasPaymentMethod) {
        this.notificationService.showInfo("El contrato no tiene el método sendPayment, pero puedes depositar ETH")
      }

      // Cargar el balance del contrato
      const balance = await this.walletService.getContractBalance(this.contractAddress)
      this.contractBalance = balance
      
      this.walletService.setContractAddress(this.contractAddress)
      this.notificationService.showSuccess("Contrato cargado correctamente")
      
      console.log("Contract loaded:", {
        address: this.contractAddress,
        balance: this.contractBalance,
        hasPaymentMethod: hasPaymentMethod
      })
      
    } catch (error: any) {
      console.error("Error loading contract:", error)
      this.notificationService.showError(error.message || "Error al cargar el contrato")
      this.contractBalance = "0"
    } finally {
      this.isLoadingContract = false
    }
  }

  // Enviar pago desde contrato
  async sendContractPayment(): Promise<void> {
    if (!this.validateContractForm()) return

    this.isLoading = true
    this.errorMessage = ""

    try {
      // Verificar nuevamente que el contrato tenga fondos suficientes
      const currentBalance = await this.walletService.getContractBalance(this.contractAddress)
      if (Number.parseFloat(currentBalance) < Number.parseFloat(this.contractAmount)) {
        throw new Error("El contrato no tiene fondos suficientes")
      }

      const transaction = await this.walletService.sendPaymentFromContract(
        this.contractAddress,
        this.contractRecipient,
        this.contractAmount,
        this.contractGasPrice,
      )

      this.transactionHash = transaction.hash
      this.notificationService.showSuccess("¡Pago desde contrato enviado correctamente!")

      // Esperar confirmación
      try {
        await transaction.wait()
        this.notificationService.showSuccess("¡Transacción confirmada!")
        
        // Actualizar balance del contrato después de la confirmación
        setTimeout(async () => {
          await this.loadContractBalance()
        }, 2000)
        
      } catch (err) {
        console.warn("No se pudo confirmar la transacción:", err)
      }

      await this.walletService.refreshBalance()

      this.showSuccessModal = true
    } catch (error: any) {
      console.error("Error sending contract payment:", error)
      this.errorMessage = error.message || "Error al enviar el pago desde el contrato"
      this.notificationService.showError(this.errorMessage)
    } finally {
      this.isLoading = false
    }
  }

  // ===== MÉTODOS PARA GESTIÓN DE CONTRATOS =====

  // Cargar contrato para gestión
  async loadManageContract(): Promise<void> {
    if (!this.manageContractAddress) {
      this.notificationService.showError("Por favor, ingresa una dirección de contrato")
      return
    }

    if (!this.manageContractAddress.startsWith("0x") || this.manageContractAddress.length !== 42) {
      this.notificationService.showError("Por favor, ingresa una dirección de contrato válida")
      return
    }
    this.isLoadingManage = true
    this.manageContractBalance = "0"
    
    try {
      const isValid = await this.walletService.isValidContract(this.manageContractAddress)
      if (!isValid) {
        throw new Error("La dirección no es un contrato válido")
      }

      const balance = await this.walletService.getContractBalance(this.manageContractAddress)
      this.manageContractBalance = balance
      this.notificationService.showSuccess("Contrato cargado para gestión")
      
      console.log("Manage contract loaded:", {
        address: this.manageContractAddress,
        balance: this.manageContractBalance
      })
      
    } catch (error: any) {
      console.error("Error loading manage contract:", error)
      this.notificationService.showError(error.message || "Error al cargar el contrato")
      this.manageContractBalance = "0"
    } finally {
      this.isLoadingManage = false
    }
  }

  // Depositar en contrato
  async depositToContract(): Promise<void> {
    if (!this.validateDepositForm()) return

    this.isLoading = true
    this.errorMessage = ""

    try {
      // Verificar que el usuario tenga fondos suficientes
      const userBalance = await this.walletService.getProvider()?.getBalance(this.currentWallet)
      if (userBalance) {
        const userBalanceEth = Number.parseFloat(formatEther(userBalance))
        const depositAmountEth = Number.parseFloat(this.depositAmount)
        
        if (userBalanceEth < depositAmountEth) {
          throw new Error("No tienes fondos suficientes para realizar este depósito")
        }
      }

      const transaction = await this.walletService.depositToContract(
        this.manageContractAddress,
        this.depositAmount,
        this.depositGasPrice,
      )

      this.transactionHash = transaction.hash
      this.notificationService.showSuccess("¡Depósito al contrato enviado correctamente!")

      // Esperar confirmación
      try {
        await transaction.wait()
        this.notificationService.showSuccess("¡Depósito confirmado!")
        
        // Actualizar balance del contrato después de la confirmación
        setTimeout(async () => {
          await this.loadManageContract()
        }, 2000)
        
      } catch (err) {
        console.warn("No se pudo confirmar el depósito:", err)
      }

      await this.walletService.refreshBalance()

      this.showSuccessModal = true
    } catch (error: any) {
      console.error("Error depositing to contract:", error)
      this.errorMessage = error.message || "Error al depositar en el contrato"
      this.notificationService.showError(this.errorMessage)
    } finally {
      this.isLoading = false
    }
  }

  // ===== VALIDACIONES =====

  validateForm(): boolean {
    this.errorMessage = ""

    if (this.searchContactTerm && this.searchContactTerm.startsWith("0x") && this.searchContactTerm.length === 42) {
      this.recipientAddress = this.searchContactTerm
    }

    if (!this.recipientAddress) {
      this.errorMessage = "Por favor, ingresa una dirección de wallet válida"
      return false
    }

    if (!this.recipientAddress.startsWith("0x") || this.recipientAddress.length !== 42) {
      this.errorMessage = "Por favor, ingresa una dirección de wallet Ethereum válida"
      return false
    }

    if (!this.amount || Number.parseFloat(this.amount) <= 0) {
      this.errorMessage = "Por favor, ingresa una cantidad válida"
      return false
    }

    if (!this.gasPrice || Number.parseFloat(this.gasPrice) <= 0) {
      this.errorMessage = "Por favor, ingresa un precio de gas válido"
      return false
    }

    return true
  }

  validateContractForm(): boolean {
    this.errorMessage = ""

    if (!this.contractAddress) {
      this.errorMessage = "Por favor, carga un contrato primero"
      return false
    }

    if (!this.contractRecipient) {
      this.errorMessage = "Por favor, ingresa una dirección de destinatario"
      return false
    }

    if (!this.contractRecipient.startsWith("0x") || this.contractRecipient.length !== 42) {
      this.errorMessage = "Por favor, ingresa una dirección de wallet Ethereum válida"
      return false
    }

    if (!this.contractAmount || Number.parseFloat(this.contractAmount) <= 0) {
      this.errorMessage = "Por favor, ingresa una cantidad válida"
      return false
    }

    if (Number.parseFloat(this.contractAmount) > Number.parseFloat(this.contractBalance)) {
      this.errorMessage = "La cantidad excede el balance del contrato"
      return false
    }

    if (!this.contractGasPrice || Number.parseFloat(this.contractGasPrice) <= 0) {
      this.errorMessage = "Por favor, ingresa un precio de gas válido"
      return false
    }

    return true
  }

  validateDepositForm(): boolean {
    this.errorMessage = ""

    if (!this.manageContractAddress) {
      this.errorMessage = "Por favor, carga un contrato primero"
      return false
    }

    if (!this.depositAmount || Number.parseFloat(this.depositAmount) <= 0) {
      this.errorMessage = "Por favor, ingresa una cantidad válida para depositar"
      return false
    }

    if (!this.depositGasPrice || Number.parseFloat(this.depositGasPrice) <= 0) {
      this.errorMessage = "Por favor, ingresa un precio de gas válido"
      return false
    }

    return true
  }

  // ===== MÉTODOS DE UI =====

  openConfirmModal(): void {
    if (this.currentMode === "normal" && this.validateForm()) {
      this.showModal = true
    } else if (this.currentMode === "contract" && this.validateContractForm()) {
      this.showModal = true
    }
  }

  closeModal(): void {
    this.showModal = false
  }

  closeSuccessModal(): void {
    this.showSuccessModal = false
    this.resetForms()
    this.notificationService.showInfo("Puedes realizar otra operación")
  }

  onRecipientFocus(): void {
    this.showContactsList = true
  }

  onClickOutside(event: Event): void {
    if (!(event.target as HTMLElement).closest(".contact-search-container")) {
      this.showContactsList = false
    }
  }

  // Copiar hash de transacción
  copyTransactionHash(): void {
    navigator.clipboard
      .writeText(this.transactionHash)
      .then(() => {
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

  // Enviar transacción normal (método existente simplificado)
  async sendTransaction(): Promise<void> {
    this.isLoading = true
    this.errorMessage = ""

    try {
      const provider = this.walletService.getProvider()
      if (!provider) throw new Error("No se pudo obtener el proveedor de wallet")

      const signer = await provider.getSigner()
      const tx = {
        to: this.recipientAddress.trim().toLowerCase(),
        value: parseEther(this.amount),
        gasPrice: parseUnits(this.gasPrice, "gwei"),
      }

      const transaction = await signer.sendTransaction(tx)
      this.transactionHash = transaction.hash
      this.showModal = false

      this.notificationService.showSuccess("¡Transacción enviada correctamente!")

      try {
        await transaction.wait()
        this.notificationService.showSuccess("¡Transacción confirmada!")
      } catch (err) {
        console.warn("No se pudo confirmar la transacción:", err)
      }

      this.showSuccessModal = true
      await this.walletService.refreshBalance()
    } catch (error: any) {
      console.error("Error al enviar la transacción:", error)
      this.errorMessage = error.message || "Error al enviar la transacción"
      this.showModal = false
      this.notificationService.showError(this.errorMessage)
    } finally {
      this.isLoading = false
    }
  }
}