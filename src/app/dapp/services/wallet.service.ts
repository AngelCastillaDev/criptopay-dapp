import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { BrowserProvider, formatEther } from "ethers";
import { Router } from "@angular/router";

declare global {
  interface Window {
    ethereum: any;
  }
}

@Injectable({
  providedIn: "root",
})
export class WalletService {
  private accountSubject = new BehaviorSubject<string>("");
  private balanceSubject = new BehaviorSubject<string>("0");
  private networkSubject = new BehaviorSubject<string>("Desconocida");
  private provider: BrowserProvider | null = null;
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private isConnectingSubject = new BehaviorSubject<boolean>(false);
  private isCheckingConnectionSubject = new BehaviorSubject<boolean>(true);

  account$ = this.accountSubject.asObservable();
  balance$ = this.balanceSubject.asObservable();
  network$ = this.networkSubject.asObservable();
  isConnected$ = this.isConnectedSubject.asObservable();
  isConnecting$ = this.isConnectingSubject.asObservable();
  isCheckingConnection$ = this.isCheckingConnectionSubject.asObservable();

  constructor(private router: Router) {
    // Verificar la conexión al iniciar el servicio
    this.checkConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnect();
        } else {
          this.accountSubject.next(accounts[0]);
          this.updateBalance(accounts[0]);
        }
      });

      // Mejorar el manejo del evento chainChanged
      window.ethereum.on("chainChanged", async (chainId: string) => {
        console.log("Chain changed to:", chainId);
        this.updateNetworkName(chainId);

        // Recrear el provider con la nueva cadena
        this.provider = new BrowserProvider(window.ethereum);

        // Obtener la cuenta actual y actualizar el balance
        const currentAccount = this.accountSubject.getValue();
        if (currentAccount) {
          console.log("Updating balance for account:", currentAccount);
          // Esperar un momento para que la red se actualice completamente
          setTimeout(async () => {
            await this.updateBalance(currentAccount);
          }, 1000);
        }
      });
    }
  }

  private async checkConnection() {
    this.isCheckingConnectionSubject.next(true);

    try {
      if (localStorage.getItem("walletConnected") === "true" && window.ethereum) {
        console.log("Checking existing wallet connection...");

        try {
          this.provider = new BrowserProvider(window.ethereum);

          // Verificar si MetaMask está desbloqueado y tenemos acceso a las cuentas
          const accounts = await this.provider.send("eth_accounts", []);

          if (accounts.length > 0) {
            console.log("Wallet reconnected successfully:", accounts[0]);

            // Obtener la cadena actual
            const chainId = await this.provider.send("eth_chainId", []);
            this.updateNetworkName(chainId);

            // Actualizar el estado de la conexión
            this.accountSubject.next(accounts[0]);
            this.isConnectedSubject.next(true);

            // Actualizar el balance
            await this.updateBalance(accounts[0]);

            return true;
          } else {
            console.log("No accounts found, wallet is locked or permission was denied");
            localStorage.removeItem("walletConnected");
            this.isConnectedSubject.next(false);
            return false;
          }
        } catch (error) {
          console.error("Failed to reconnect wallet:", error);
          localStorage.removeItem("walletConnected");
          this.isConnectedSubject.next(false);
          return false;
        }
      } else {
        console.log("No previous wallet connection found");
        this.isConnectedSubject.next(false);
        return false;
      }
    } finally {
      this.isCheckingConnectionSubject.next(false);
    }
  }

  async connect(): Promise<string> {
    if (!window.ethereum) {
      throw new Error("MetaMask no está instalado");
    }

    try {
      this.isConnectingSubject.next(true);
      this.provider = new BrowserProvider(window.ethereum);

      // This will trigger the MetaMask popup
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        throw new Error("No se seleccionó ninguna cuenta");
      }

      const account = accounts[0];
      this.accountSubject.next(account);
      this.isConnectedSubject.next(true);
      localStorage.setItem("walletConnected", "true");

      // Get current chain ID
      const chainId = await this.provider.send("eth_chainId", []);
      this.updateNetworkName(chainId);

      await this.updateBalance(account);

      return account;
    } catch (error: any) {
      console.error("Error connecting to MetaMask:", error);
      this.isConnectedSubject.next(false);
      localStorage.removeItem("walletConnected");
      throw error;
    } finally {
      this.isConnectingSubject.next(false);
    }
  }

  async disconnect() {
    this.accountSubject.next("");
    this.balanceSubject.next("0");
    this.isConnectedSubject.next(false);
    localStorage.removeItem("walletConnected");

    // Redirigir al inicio después de desconectar
    this.router.navigate(["/"]);
  }

  private async updateBalance(account: string) {
    if (!this.provider || !account) {
      console.log("No provider or account available to update balance");
      return;
    }

    try {
      console.log("Fetching balance for account:", account);
      // Reintentar hasta 3 veces en caso de error
      let attempts = 0;
      let success = false;
      let formatted = "0";

      while (attempts < 3 && !success) {
        try {
          // Recrear el provider para asegurarnos de que está actualizado con la red actual
          this.provider = new BrowserProvider(window.ethereum);

          // Obtener el balance
          const balance = await this.provider.getBalance(account);
          formatted = parseFloat(formatEther(balance)).toFixed(4);
          console.log("Balance fetched:", formatted, "ETH");
          success = true;
        } catch (error) {
          console.error(`Error fetching balance (attempt ${attempts + 1}):`, error);
          attempts++;
          // Esperar un poco antes de reintentar
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Si después de los intentos tenemos un balance, actualizarlo
      if (success) {
        this.balanceSubject.next(formatted);
      } else {
        console.error("Failed to fetch balance after multiple attempts");
        // No actualizamos el balance para mantener el valor anterior
      }
    } catch (error) {
      console.error("Error in updateBalance:", error);
      // No actualizamos el balance para mantener el valor anterior
    }
  }

  private updateNetworkName(chainId: string): void {
    let networkName = "Desconocida";

    switch (chainId) {
      case "0x1": // Ethereum Mainnet
        networkName = "Ethereum";
        break;
      case "0xaa36a7": // Sepolia
        networkName = "Sepolia";
        break;
      case "0x5": // Goerli
        networkName = "Goerli";
        break;
      case "0x4268": // Holesky
        networkName = "Holesky";
        break;
      case "0x89": // Polygon
        networkName = "Polygon";
        break;
      case "0x13881": // Mumbai
        networkName = "Mumbai";
        break;
    }

    console.log("Network updated to:", networkName);
    this.networkSubject.next(networkName);
  }

  async switchNetwork(chainId: string): Promise<void> {
    if (!window.ethereum) throw new Error("MetaMask no está instalado");

    try {
      console.log("Switching to network with chainId:", chainId);

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });

      // La actualización del nombre de la red y el balance se manejará 
      // automáticamente a través del evento chainChanged

    } catch (error: any) {
      console.error("Error switching network:", error);
      if (error.code === 4902) {
        throw new Error("La red no está configurada en MetaMask");
      }
      throw error;
    }
  }

  getProvider(): BrowserProvider | null {
    return this.provider;
  }

  // Método para forzar la actualización del balance
  async refreshBalance(): Promise<void> {
    console.log("Manual balance refresh requested");
    const account = this.accountSubject.getValue();
    if (account) {
      // Recrear el provider para asegurarnos de que está actualizado
      if (window.ethereum) {
        this.provider = new BrowserProvider(window.ethereum);
      }
      await this.updateBalance(account);
    } else {
      console.log("No account available to refresh balance");
    }
  }

  // Método para verificar si hay una conexión guardada y reconectar
  async autoReconnect(): Promise<boolean> {
    return this.checkConnection();
  }
}