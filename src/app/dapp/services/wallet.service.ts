import { Injectable } from "@angular/core"
import { BehaviorSubject } from "rxjs"
import { BrowserProvider, formatEther, parseEther, parseUnits, Contract } from "ethers"
import { Router } from "@angular/router"
import contractABI from '../../../app/dapp/abi/transaction.json'

declare global {
  interface Window {
    ethereum: any
  }
}

// ABI del Smart Contract - Cargado desde el archivo JSON
const CONTRACT_ABI = contractABI

@Injectable({
  providedIn: "root",
})
export class WalletService {
  private accountSubject = new BehaviorSubject<string>("")
  private balanceSubject = new BehaviorSubject<string>("0")
  private networkSubject = new BehaviorSubject<string>("Desconocida")
  private provider: BrowserProvider | null = null
  private isConnectedSubject = new BehaviorSubject<boolean>(false)
  private isConnectingSubject = new BehaviorSubject<boolean>(false)
  private isCheckingConnectionSubject = new BehaviorSubject<boolean>(true)

  // Nuevos subjects para Smart Contracts
  private contractBalanceSubject = new BehaviorSubject<string>("0")
  private contractAddressSubject = new BehaviorSubject<string>("")

  account$ = this.accountSubject.asObservable()
  balance$ = this.balanceSubject.asObservable()
  network$ = this.networkSubject.asObservable()
  isConnected$ = this.isConnectedSubject.asObservable()
  isConnecting$ = this.isConnectingSubject.asObservable()
  isCheckingConnection$ = this.isCheckingConnectionSubject.asObservable()

  // Nuevos observables para Smart Contracts
  contractBalance$ = this.contractBalanceSubject.asObservable()
  contractAddress$ = this.contractAddressSubject.asObservable()

  constructor(private router: Router) {
    this.checkConnection()

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        console.log("Accounts changed:", accounts)
        if (accounts.length === 0) {
          this.disconnect()
        } else {
          this.accountSubject.next(accounts[0])
          this.updateBalance(accounts[0])
        }
      })

      window.ethereum.on("chainChanged", async (chainId: string) => {
        console.log("Chain changed to:", chainId)
        this.updateNetworkName(chainId)
        this.provider = new BrowserProvider(window.ethereum)

        const currentAccount = this.accountSubject.getValue()
        if (currentAccount) {
          setTimeout(async () => {
            await this.updateBalance(currentAccount)
          }, 1000)
        }
      })
    }
  }

  private async checkConnection() {
    this.isCheckingConnectionSubject.next(true)

    try {
      if (localStorage.getItem("walletConnected") === "true" && window.ethereum) {
        console.log("Checking existing wallet connection...")

        try {
          this.provider = new BrowserProvider(window.ethereum)
          const accounts = await this.provider.send("eth_accounts", [])

          if (accounts.length > 0) {
            console.log("Wallet reconnected successfully:", accounts[0])

            const chainId = await this.provider.send("eth_chainId", [])
            this.updateNetworkName(chainId)

            this.accountSubject.next(accounts[0])
            this.isConnectedSubject.next(true)

            await this.updateBalance(accounts[0])
            return true
          } else {
            console.log("No accounts found, wallet is locked or permission was denied")
            localStorage.removeItem("walletConnected")
            this.isConnectedSubject.next(false)
            return false
          }
        } catch (error) {
          console.error("Failed to reconnect wallet:", error)
          localStorage.removeItem("walletConnected")
          this.isConnectedSubject.next(false)
          return false
        }
      } else {
        console.log("No previous wallet connection found")
        this.isConnectedSubject.next(false)
        return false
      }
    } finally {
      this.isCheckingConnectionSubject.next(false)
    }
  }

  async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask no está instalado")
    }

    try {
      this.isConnectingSubject.next(true)
      this.provider = new BrowserProvider(window.ethereum)

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length === 0) {
        throw new Error("No se seleccionó ninguna cuenta")
      }

      const account = accounts[0]
      this.accountSubject.next(account)
      this.isConnectedSubject.next(true)
      localStorage.setItem("walletConnected", "true")

      const chainId = await this.provider.send("eth_chainId", [])
      this.updateNetworkName(chainId)

      await this.updateBalance(account)

      return account
    } catch (error: any) {
      console.error("Error connecting to MetaMask:", error)
      this.isConnectedSubject.next(false)
      localStorage.removeItem("walletConnected")
      throw error
    } finally {
      this.isConnectingSubject.next(false)
    }
  }

  async disconnect() {
    this.accountSubject.next("")
    this.balanceSubject.next("0")
    this.networkSubject.next("Desconocida")
    this.contractBalanceSubject.next("0")
    this.contractAddressSubject.next("")
    this.isConnectedSubject.next(false)
    localStorage.removeItem("walletConnected")

    this.router.navigate(["/"])
  }

  private async updateBalance(account: string) {
    if (!this.provider || !account) {
      console.log("No provider or account available to update balance")
      return
    }

    try {
      console.log("Fetching balance for account:", account)
      let attempts = 0
      let success = false
      let formatted = "0"

      while (attempts < 3 && !success) {
        try {
          this.provider = new BrowserProvider(window.ethereum)
          const balance = await this.provider.getBalance(account)
          formatted = Number.parseFloat(formatEther(balance)).toFixed(4)
          console.log("Balance fetched:", formatted, "ETH")
          success = true
        } catch (error) {
          console.error(`Error fetching balance (attempt ${attempts + 1}):`, error)
          attempts++
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      if (success) {
        this.balanceSubject.next(formatted)
      } else {
        console.error("Failed to fetch balance after multiple attempts")
      }
    } catch (error) {
      console.error("Error in updateBalance:", error)
    }
  }

  private updateNetworkName(chainId: string): void {
    let networkName = "Desconocida"

    switch (chainId) {
      case "0x1":
        networkName = "Ethereum"
        break
      case "0xaa36a7":
        networkName = "Sepolia"
        break
      case "0x5":
        networkName = "Goerli"
        break
      case "0x4268":
        networkName = "Holesky"
        break
      case "0x89":
        networkName = "Polygon"
        break
      case "0x13881":
        networkName = "Mumbai"
        break
    }

    console.log("Network updated to:", networkName)
    this.networkSubject.next(networkName)
  }

  async switchNetwork(chainId: string): Promise<void> {
    if (!window.ethereum) throw new Error("MetaMask no está instalado")

    try {
      console.log("Switching to network with chainId:", chainId)

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      })
    } catch (error: any) {
      console.error("Error switching network:", error)
      if (error.code === 4902) {
        throw new Error("La red no está configurada en MetaMask")
      }
      throw error
    }
  }

  getProvider(): BrowserProvider | null {
    return this.provider
  }

  async refreshBalance(): Promise<void> {
    console.log("Manual balance refresh requested")
    const account = this.accountSubject.getValue()
    if (account) {
      if (window.ethereum) {
        this.provider = new BrowserProvider(window.ethereum)
      }
      await this.updateBalance(account)
    } else {
      console.log("No account available to refresh balance")
    }
  }

  async autoReconnect(): Promise<boolean> {
    return this.checkConnection()
  }

  // ===== MÉTODOS PARA SMART CONTRACTS =====

  /**
   * Obtener el balance de un Smart Contract
   */
  async getContractBalance(contractAddress: string): Promise<string> {
    if (!this.provider || !contractAddress) {
      throw new Error("Provider o dirección de contrato no disponible")
    }

    try {
      // Obtener el balance directamente del contrato usando getBalance del provider
      const balance = await this.provider.getBalance(contractAddress)
      const formatted = Number.parseFloat(formatEther(balance)).toFixed(6)
      console.log("Contract balance fetched:", formatted, "ETH")
      return formatted
    } catch (error) {
      console.error("Error fetching contract balance:", error)
      throw new Error("Error al obtener el balance del contrato")
    }
  }

  /**
   * Enviar pago desde Smart Contract
   */
  async sendPaymentFromContract(
    contractAddress: string,
    recipientAddress: string,
    amount: string,
    gasPrice: string,
  ): Promise<any> {
    if (!this.provider) {
      throw new Error("Provider no disponible")
    }

    try {
      const signer = await this.provider.getSigner()
      const contract = new Contract(contractAddress, CONTRACT_ABI, signer)

      // Usar el método sendPayment del contrato - el valor se pasa como parámetro separado
      const transaction = await contract['sendPayment'](recipientAddress, parseEther(amount), {
        gasPrice: parseUnits(gasPrice, "gwei"),
      })

      console.log("Contract payment sent:", transaction.hash)
      return transaction
    } catch (error) {
      console.error("Error sending contract payment:", error)
      throw error
    }
  }

  /**
   * Depositar ETH en Smart Contract
   */
  async depositToContract(contractAddress: string, amount: string, gasPrice: string): Promise<any> {
    if (!this.provider) {
      throw new Error("Provider no disponible")
    }

    try {
      const signer = await this.provider.getSigner()

      // Para depositar, enviamos ETH directamente al contrato
      const transaction = await signer.sendTransaction({
        to: contractAddress,
        value: parseEther(amount),
        gasPrice: parseUnits(gasPrice, "gwei"),
      })


      console.log("Contract deposit sent:", transaction.hash)
      return transaction
    } catch (error) {
      console.error("Error depositing to contract:", error)
      throw error
    }
  }

  /**
   * Verificar si una dirección es un contrato válido
   */
  async isValidContract(contractAddress: string): Promise<boolean> {
    if (!this.provider || !contractAddress) {
      return false
    }

    try {
      // Verificar que la dirección tenga el formato correcto
      if (!contractAddress.startsWith("0x") || contractAddress.length !== 42) {
        return false
      }

      const code = await this.provider.getCode(contractAddress)
      const isContract = code !== "0x"

      if (isContract) {
        console.log("Valid contract found at:", contractAddress)
        console.log("Contract code length:", code.length)
      }

      return isContract
    } catch (error) {
      console.error("Error checking contract validity:", error)
      return false
    }
  }

  /**
   * Verificar si un contrato tiene el método sendPayment
   */
  async hasPaymentMethod(contractAddress: string): Promise<boolean> {
    if (!this.provider || !contractAddress) {
      return false
    }

    try {
      const contract = new Contract(contractAddress, CONTRACT_ABI, this.provider)
      // Intentar llamar al método sendPayment con datos de prueba para verificar si existe
      // Esto no ejecutará la transacción, solo verificará si el método existe
      await contract['sendPayment'].staticCall("0x0000000000000000000000000000000000000000", 0)
      return true
    } catch (error: any) {
      // Si el error es por fondos insuficientes o parámetros inválidos, el método existe
      if (error.message.includes("insufficient funds") ||
        error.message.includes("invalid address") ||
        error.message.includes("execution reverted") ||
        error.message.includes("call revert exception")) {
        return true
      }
      console.log("Contract does not have sendPayment method:", error.message)
      return false
    }
  }
  /**
   * Actualizar balance del contrato actual
   */
  async updateContractBalance(): Promise<void> {
    const contractAddress = this.contractAddressSubject.getValue()
    if (contractAddress) {
      try {
        const balance = await this.getContractBalance(contractAddress)
        this.contractBalanceSubject.next(balance)
      } catch (error) {
        console.error("Error updating contract balance:", error)
        this.contractBalanceSubject.next("0")
      }
    }
  }

  /**
   * Establecer dirección de contrato actual
   */
  setContractAddress(address: string): void {
    this.contractAddressSubject.next(address)
    if (address) {
      this.updateContractBalance()
    } else {
      this.contractBalanceSubject.next("0")
    }
  }

  /**
   * Obtener dirección de contrato actual
   */
  getCurrentContractAddress(): string {
    return this.contractAddressSubject.getValue()
  }

  /**
   * Obtener balance de contrato actual
   */
  getCurrentContractBalance(): string {
    return this.contractBalanceSubject.getValue()
  }
}
