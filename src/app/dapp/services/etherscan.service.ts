import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable, throwError } from "rxjs"
import { map, catchError } from "rxjs/operators"

export interface EtherscanTransaction {
    blockNumber: string
    timeStamp: string
    hash: string
    nonce: string
    blockHash: string
    transactionIndex: string
    from: string
    to: string
    value: string
    gas: string
    gasPrice: string
    isError: string
    txreceipt_status: string
    input: string
    contractAddress: string
    cumulativeGasUsed: string
    gasUsed: string
    confirmations: string
}

export interface EtherscanResponse {
    status: string
    message: string
    result: EtherscanTransaction[]
}

export interface ProcessedTransaction {
    id: string
    type: "sent" | "received"
    amount: string
    address: string
    timestamp: Date
    status: "completed" | "failed"
    hash: string
    from_address: string
    to_address: string
    network: string
}

@Injectable({
    providedIn: "root",
})
export class EtherscanService {
    private readonly API_KEY = "Y9FZSQ8S81DVTSA1YZBKQRE3FH4B2GK3BB"

    // URLs base para diferentes redes
    private readonly NETWORK_URLS = {
        Ethereum: "https://api.etherscan.io/api",
        Sepolia: "https://api-sepolia.etherscan.io/api",
        Goerli: "https://api-goerli.etherscan.io/api",
        Holesky: "https://api-holesky.etherscan.io/api",
        Polygon: "https://api.polygonscan.com/api",
        Mumbai: "https://api-testnet.polygonscan.com/api",
    }

    constructor(private http: HttpClient) { }

    /**
     * Obtiene las transacciones de una dirección en una red específica
     */
    getTransactions(address: string, network: string): Observable<ProcessedTransaction[]> {
        const baseUrl = this.getNetworkUrl(network)

        if (!baseUrl) {
            return throwError(() => new Error(`Red no soportada: ${network}`))
        }

        const url = `${baseUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=100&sort=desc&apikey=${this.API_KEY}`

        return this.http.get<EtherscanResponse>(url).pipe(
            map((response) => {
                if (response.status !== "1") {
                    throw new Error(response.message || "Error al obtener transacciones")
                }
                return this.processTransactions(response.result, address, network)
            }),
            catchError((error) => {
                console.error("Error fetching transactions:", error)
                return throwError(() => error)
            }),
        )
    }

    /**
     * Obtiene el balance de una dirección en una red específica
     */
    getBalance(address: string, network: string): Observable<string> {
        const baseUrl = this.getNetworkUrl(network)

        if (!baseUrl) {
            return throwError(() => new Error(`Red no soportada: ${network}`))
        }

        const url = `${baseUrl}?module=account&action=balance&address=${address}&tag=latest&apikey=${this.API_KEY}`

        return this.http.get<any>(url).pipe(
            map((response) => {
                if (response.status !== "1") {
                    throw new Error(response.message || "Error al obtener balance")
                }
                // Convertir de Wei a ETH
                const balanceInWei = response.result
                const balanceInEth = (Number.parseInt(balanceInWei) / Math.pow(10, 18)).toFixed(4)
                return balanceInEth
            }),
            catchError((error) => {
                console.error("Error fetching balance:", error)
                return throwError(() => error)
            }),
        )
    }

    /**
     * Obtiene la URL base para una red específica
     */
    private getNetworkUrl(network: string): string | null {
        return this.NETWORK_URLS[network as keyof typeof this.NETWORK_URLS] || null
    }

    /**
     * Procesa las transacciones raw de Etherscan al formato interno
     */
    private processTransactions(
        transactions: EtherscanTransaction[],
        userAddress: string,
        network: string,
    ): ProcessedTransaction[] {
        return transactions.map((tx) => {
            const isSent = tx.from.toLowerCase() === userAddress.toLowerCase()
            const valueInEth = (Number.parseInt(tx.value) / Math.pow(10, 18)).toFixed(6)

            return {
                id: tx.hash,
                type: isSent ? "sent" : "received",
                amount: valueInEth,
                address: isSent ? tx.to : tx.from,
                timestamp: new Date(Number.parseInt(tx.timeStamp) * 1000),
                status: tx.txreceipt_status === "1" ? "completed" : "failed",
                hash: tx.hash,
                from_address: tx.from,
                to_address: tx.to,
                network: network,
            }
        })
    }

    /**
     * Verifica si una red está soportada
     */
    isNetworkSupported(network: string): boolean {
        return network in this.NETWORK_URLS
    }

    /**
     * Obtiene la lista de redes soportadas
     */
    getSupportedNetworks(): string[] {
        return Object.keys(this.NETWORK_URLS)
    }
}
