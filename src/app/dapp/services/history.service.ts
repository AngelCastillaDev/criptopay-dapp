import { Injectable } from "@angular/core"
import { BehaviorSubject, combineLatest, EMPTY } from "rxjs"
import { switchMap, debounceTime, distinctUntilChanged, catchError } from "rxjs/operators"
import { EtherscanService, ProcessedTransaction } from "./etherscan.service"
import { WalletService } from "./wallet.service"
import { NotificationService } from "./notificacion.service"

@Injectable({
    providedIn: "root",
})
export class HistoryService {
    private allTransactionsSubject = new BehaviorSubject<ProcessedTransaction[]>([])
    private filteredTransactionsSubject = new BehaviorSubject<ProcessedTransaction[]>([])
    private paginatedTransactionsSubject = new BehaviorSubject<ProcessedTransaction[]>([])
    private isLoadingSubject = new BehaviorSubject<boolean>(false)
    private refreshTriggerSubject = new BehaviorSubject<void>(undefined)

    // Propiedades para filtros
    private currentFilterSubject = new BehaviorSubject<"all" | "sent" | "received">("all")
    private searchTermSubject = new BehaviorSubject<string>("")

    // Propiedades para paginación
    private currentPageSubject = new BehaviorSubject<number>(1)
    private totalPagesSubject = new BehaviorSubject<number>(1)
    private itemsPerPageSubject = new BehaviorSubject<number>(10)

    // Observables públicos
    allTransactions$ = this.allTransactionsSubject.asObservable()
    filteredTransactions$ = this.filteredTransactionsSubject.asObservable()
    transactions$ = this.paginatedTransactionsSubject.asObservable()
    isLoading$ = this.isLoadingSubject.asObservable()

    currentFilter$ = this.currentFilterSubject.asObservable()
    searchTerm$ = this.searchTermSubject.asObservable()
    currentPage$ = this.currentPageSubject.asObservable()
    totalPages$ = this.totalPagesSubject.asObservable()
    itemsPerPage$ = this.itemsPerPageSubject.asObservable()

    constructor(
        private etherscanService: EtherscanService,
        private walletService: WalletService,
        private notificationService: NotificationService,
    ) {
        this.initializeAutoRefresh()
        this.initializeFilters()
    }

    private initializeAutoRefresh(): void {
        // Combinar cambios de wallet, red y trigger manual de refresh
        combineLatest([this.walletService.account$, this.walletService.network$, this.refreshTriggerSubject])
            .pipe(
                debounceTime(500),
                distinctUntilChanged((prev, curr) => prev[0] === curr[0] && prev[1] === curr[1]),
                switchMap(([account, network]) => {
                    // Limpiar transacciones anteriores inmediatamente
                    this.clearAllTransactions()

                    if (!account || !network || network === "Desconocida") {
                        this.isLoadingSubject.next(false)
                        return EMPTY
                    }

                    if (!this.etherscanService.isNetworkSupported(network)) {
                        console.warn(`Red no soportada: ${network}`)
                        this.isLoadingSubject.next(false)
                        return EMPTY
                    }

                    this.isLoadingSubject.next(true)
                    console.log(`Cargando transacciones para ${account} en red ${network}`)

                    return this.etherscanService.getTransactions(account, network).pipe(
                        catchError((error) => {
                            console.error("Error loading transactions:", error)
                            this.notificationService.showError(`Error al cargar transacciones de ${network}`)
                            this.isLoadingSubject.next(false)
                            return EMPTY
                        }),
                    )
                }),
            )
            .subscribe({
                next: (transactions) => {
                    console.log(`Transacciones cargadas: ${transactions.length}`)
                    this.allTransactionsSubject.next(transactions)
                    this.isLoadingSubject.next(false)
                },
                error: (error) => {
                    console.error("Error en el flujo de transacciones:", error)
                    this.isLoadingSubject.next(false)
                },
            })
    }

    private initializeFilters(): void {
        // Combinar cambios en transacciones, filtros y búsqueda
        combineLatest([
            this.allTransactionsSubject,
            this.currentFilterSubject,
            this.searchTermSubject,
            this.currentPageSubject,
            this.itemsPerPageSubject,
        ]).subscribe(([allTransactions, filter, searchTerm, currentPage, itemsPerPage]) => {
            console.log("Aplicando filtros:", { filter, searchTerm, currentPage, itemsPerPage })

            // Aplicar filtros
            const filtered = this.applyFilters(allTransactions, filter, searchTerm)
            this.filteredTransactionsSubject.next(filtered)

            // Calcular paginación sobre resultados filtrados
            const totalPages = Math.ceil(filtered.length / itemsPerPage)
            const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages || 1)

            // Actualizar total de páginas
            this.totalPagesSubject.next(totalPages)

            // Si la página actual no es válida, ajustarla
            if (validCurrentPage !== currentPage) {
                this.currentPageSubject.next(validCurrentPage)
                return // Se volverá a ejecutar con la página correcta
            }

            // Aplicar paginación
            const startIndex = (validCurrentPage - 1) * itemsPerPage
            const endIndex = startIndex + itemsPerPage
            const paginatedTransactions = filtered.slice(startIndex, endIndex)

            console.log(`Mostrando ${paginatedTransactions.length} de ${filtered.length} transacciones filtradas`)
            this.paginatedTransactionsSubject.next(paginatedTransactions)
        })
    }

    private applyFilters(
        transactions: ProcessedTransaction[],
        filter: "all" | "sent" | "received",
        searchTerm: string,
    ): ProcessedTransaction[] {
        let filtered = [...transactions]

        // Aplicar filtro por tipo
        if (filter !== "all") {
            filtered = filtered.filter((tx) => tx.type === filter)
            console.log(`Filtro por tipo ${filter}: ${filtered.length} transacciones`)
        }

        // Aplicar filtro de búsqueda
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase()
            filtered = filtered.filter(
                (tx) =>
                    tx.address.toLowerCase().includes(term) ||
                    tx.hash.toLowerCase().includes(term) ||
                    tx.from_address.toLowerCase().includes(term) ||
                    tx.to_address.toLowerCase().includes(term),
            )
            console.log(`Filtro de búsqueda "${searchTerm}": ${filtered.length} transacciones`)
        }

        return filtered
    }

    // Métodos públicos para cambiar filtros
    setFilter(filter: "all" | "sent" | "received"): void {
        console.log("Cambiando filtro a:", filter)
        this.currentFilterSubject.next(filter)
        this.currentPageSubject.next(1) // Resetear a página 1 al cambiar filtro
    }

    setSearchTerm(searchTerm: string): void {
        console.log("Cambiando búsqueda a:", searchTerm)
        this.searchTermSubject.next(searchTerm)
        this.currentPageSubject.next(1) // Resetear a página 1 al buscar
    }

    // Métodos de paginación
    goToPage(page: number): void {
        const totalPages = this.totalPagesSubject.getValue()
        if (page < 1 || page > totalPages) return

        console.log("Cambiando a página:", page)
        this.currentPageSubject.next(page)
    }

    setItemsPerPage(itemsPerPage: number): void {
        console.log("Cambiando elementos por página a:", itemsPerPage)
        this.itemsPerPageSubject.next(itemsPerPage)
        this.currentPageSubject.next(1) // Resetear a página 1 al cambiar elementos por página
    }

    // Método para forzar actualización manual
    async refreshTransactions(): Promise<void> {
        console.log("Refresh manual de transacciones solicitado")
        this.refreshTriggerSubject.next()
    }

    // Obtener información de paginación
    getPaginationInfo(): {
        currentPage: number
        totalPages: number
        totalItems: number
        filteredItems: number
        itemsPerPage: number
    } {
        return {
            currentPage: this.currentPageSubject.getValue(),
            totalPages: this.totalPagesSubject.getValue(),
            totalItems: this.allTransactionsSubject.getValue().length,
            filteredItems: this.filteredTransactionsSubject.getValue().length,
            itemsPerPage: this.itemsPerPageSubject.getValue(),
        }
    }

    // Limpiar transacciones
    private clearAllTransactions(): void {
        this.allTransactionsSubject.next([])
        this.filteredTransactionsSubject.next([])
        this.paginatedTransactionsSubject.next([])
        this.currentPageSubject.next(1)
        this.totalPagesSubject.next(1)
    }

    clearTransactions(): void {
        this.clearAllTransactions()
    }
}
