import { Injectable } from "@angular/core";
import { BehaviorSubject } from "rxjs";
import { ethers } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface NetworkInfo {
  name: string;
  chainId: string;
  rpcUrl?: string;
  symbol?: string;
  blockExplorer?: string;
}

@Injectable({
  providedIn: "root",
})
export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private accountSubject = new BehaviorSubject<string | null>(null);
  private balanceSubject = new BehaviorSubject<string>("0");
  private networkSubject = new BehaviorSubject<string>("Desconocida");
  private chainIdSubject = new BehaviorSubject<string>("");

  isConnected$ = this.isConnectedSubject.asObservable();
  account$ = this.accountSubject.asObservable();
  balance$ = this.balanceSubject.asObservable();
  network$ = this.networkSubject.asObservable();
  chainId$ = this.chainIdSubject.asObservable();

  availableNetworks: NetworkInfo[] = [
    { name: "Ethereum Mainnet", chainId: "0x1", symbol: "ETH", blockExplorer: "https://etherscan.io" },
    { name: "Sepolia Testnet", chainId: "0xaa36a7", rpcUrl: "https://sepolia.infura.io/v3/", symbol: "ETH", blockExplorer: "https://sepolia.etherscan.io" },
    { name: "Goerli Testnet", chainId: "0x5", rpcUrl: "https://goerli.infura.io/v3/", symbol: "ETH", blockExplorer: "https://goerli.etherscan.io" },
    { name: "Holesky Testnet", chainId: "0x4268", rpcUrl: "https://ethereum-holesky.publicnode.com", symbol: "ETH", blockExplorer: "https://holesky.etherscan.io" },
    { name: "Polygon Mainnet", chainId: "0x89", rpcUrl: "https://polygon-rpc.com", symbol: "MATIC", blockExplorer: "https://polygonscan.com" },
    { name: "Polygon Mumbai", chainId: "0x13881", rpcUrl: "https://rpc-mumbai.maticvigil.com", symbol: "MATIC", blockExplorer: "https://mumbai.polygonscan.com" },
  ];

  constructor() {
    this.setupEventListeners();
    if (localStorage.getItem("walletConnected") === "true") {
      this.checkConnection();
    }
  }

  private setupEventListeners() {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async () => await this.initProvider());
      window.ethereum.on("chainChanged", async () => await this.initProvider());
      window.ethereum.on("disconnect", () => this.disconnect());
    }
  }

  async connect(): Promise<string> {
    if (!window.ethereum) throw new Error("MetaMask no está instalado");

    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await this.initProvider();
      localStorage.setItem("walletConnected", "true");
      return this.accountSubject.getValue() || "";
    } catch (error) {
      console.error("Error conectando con MetaMask:", error);
      throw error;
    }
  }

  private async initProvider() {
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    const address = await this.signer.getAddress();
    const balance = await this.provider.getBalance(address);
    const network = await this.provider.getNetwork();

    this.accountSubject.next(address);
    this.balanceSubject.next(Number(ethers.formatEther(balance)).toFixed(6));
    this.chainIdSubject.next(`0x${network.chainId.toString(16)}`);
    this.networkSubject.next(this.getNetworkName(`0x${network.chainId.toString(16)}`));
    this.isConnectedSubject.next(true);
  }

  private getNetworkName(chainId: string): string {
    const found = this.availableNetworks.find((net) => net.chainId === chainId);
    if (found) return found.name;

    switch (chainId) {
      case "0x3": return "Ropsten Testnet";
      case "0x4": return "Rinkeby Testnet";
      case "0x7a69": return "Hardhat / Localhost";
      default: return `Red #${parseInt(chainId, 16)}`;
    }
  }

  async checkConnection() {
    if (!window.ethereum) return;
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length > 0) {
      await this.initProvider();
    }
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.accountSubject.next(null);
    this.isConnectedSubject.next(false);
    this.balanceSubject.next("0");
    this.networkSubject.next("Desconocida");
    this.chainIdSubject.next("");
    localStorage.removeItem("walletConnected");
  }

  async sendTransaction(to: string, amountEth: string): Promise<string> {
    if (!this.signer) throw new Error("No hay sesión activa");

    const tx = await this.signer.sendTransaction({
      to,
      value: ethers.parseEther(amountEth),
    });

    return tx.hash;
  }

  async switchNetwork(chainId: string) {
    if (!window.ethereum) throw new Error("MetaMask no está instalado");

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        const network = this.availableNetworks.find((n) => n.chainId === chainId);
        if (network && network.rpcUrl) {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: network.chainId,
              chainName: network.name,
              nativeCurrency: {
                name: network.symbol,
                symbol: network.symbol,
                decimals: 18,
              },
              rpcUrls: [network.rpcUrl],
              blockExplorerUrls: network.blockExplorer ? [network.blockExplorer] : [],
            }],
          });
          return true;
        }
      }
      console.error("Error cambiando red:", error);
      throw error;
    }
  }
}
