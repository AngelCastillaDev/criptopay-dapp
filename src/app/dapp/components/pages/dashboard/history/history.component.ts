import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"

interface Transaction {
  id: string
  type: "sent" | "received"
  amount: string
  address: string
  timestamp: Date
  status: "pending" | "completed" | "failed"
  hash: string
}

@Component({
  selector: "app-history",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <h2 class="text-xl font-bold text-gray-900 dark:text-white">Historial de Transacciones</h2>
      
      <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Transacciones Recientes
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Últimas transacciones de tu wallet
            </p>
          </div>
          
          <div class="flex space-x-2">
            <button 
              (click)="filterTransactions('all')"
              [class.bg-blue-600]="currentFilter === 'all'"
              [class.bg-gray-200]="currentFilter !== 'all'"
              [class.dark:bg-gray-700]="currentFilter !== 'all'"
              [class.text-white]="currentFilter === 'all'"
              [class.text-gray-700]="currentFilter !== 'all'"
              [class.dark:text-gray-300]="currentFilter !== 'all'"
              class="px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Todas
            </button>
            <button 
              (click)="filterTransactions('sent')"
              [class.bg-blue-600]="currentFilter === 'sent'"
              [class.bg-gray-200]="currentFilter !== 'sent'"
              [class.dark:bg-gray-700]="currentFilter !== 'sent'"
              [class.text-white]="currentFilter === 'sent'"
              [class.text-gray-700]="currentFilter !== 'sent'"
              [class.dark:text-gray-300]="currentFilter !== 'sent'"
              class="px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Enviadas
            </button>
            <button 
              (click)="filterTransactions('received')"
              [class.bg-blue-600]="currentFilter === 'received'"
              [class.bg-gray-200]="currentFilter !== 'received'"
              [class.dark:bg-gray-700]="currentFilter !== 'received'"
              [class.text-white]="currentFilter === 'received'"
              [class.text-gray-700]="currentFilter !== 'received'"
              [class.dark:text-gray-300]="currentFilter !== 'received'"
              class="px-3 py-1 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Recibidas
            </button>
          </div>
        </div>
        
        <div class="border-t border-gray-200 dark:border-gray-700">
          <div *ngIf="filteredTransactions.length === 0" class="px-4 py-5 text-center text-gray-500 dark:text-gray-400">
            No se encontraron transacciones.
          </div>
          
          <ul *ngIf="filteredTransactions.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
            <li *ngFor="let tx of filteredTransactions" class="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center"
                       [ngClass]="{'bg-green-100 dark:bg-green-900': tx.type === 'received', 'bg-red-100 dark:bg-red-900': tx.type === 'sent'}">
                    <svg *ngIf="tx.type === 'received'" class="h-6 w-6 text-green-600 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <svg *ngIf="tx.type === 'sent'" class="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                  <div class="ml-4">
                    <div class="flex items-center">
                      <div class="text-sm font-medium text-gray-900 dark:text-white">
                        {{ tx.type === 'received' ? 'Recibido' : 'Enviado' }}
                      </div>
                      <span 
                        class="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full"
                        [ngClass]="{
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200': tx.status === 'completed',
                          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200': tx.status === 'pending',
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200': tx.status === 'failed'
                        }"
                      >
                        {{ tx.status === 'completed' ? 'Completado' : tx.status === 'pending' ? 'Pendiente' : 'Fallido' }}
                      </span>
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ tx.address | slice:0:10 }}...{{ tx.address | slice:-6 }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {{ tx.timestamp | date:'medium' }}
                    </div>
                  </div>
                </div>
                <div class="flex flex-col items-end">
                  <div class="text-sm font-medium" [ngClass]="{'text-green-600 dark:text-green-400': tx.type === 'received', 'text-red-600 dark:text-red-400': tx.type === 'sent'}">
                    {{ tx.type === 'received' ? '+' : '-' }}{{ tx.amount }} ETH
                  </div>
                  <a 
                    [href]="'https://etherscan.io/tx/' + tx.hash" 
                    target="_blank"
                    class="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mt-1"
                  >
                    Ver en Etherscan
                  </a>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class HistoryComponent {
  transactions: Transaction[] = [
    {
      id: "1",
      type: "received",
      amount: "0.5",
      address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      status: "completed",
      hash: "0x5d53558791c9346d644d077354420f9a93600acf54194937219f67d10510e5d8",
    },
    {
      id: "2",
      type: "sent",
      amount: "0.1",
      address: "0xdD870fA1b7C4700F2BD7f44238821C26f7392148",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      status: "completed",
      hash: "0x939b0adce855d9a1a9a9d40d0a3f95e8b9e894b98b05a6f6b72095c1fa348787",
    },
    {
      id: "3",
      type: "received",
      amount: "0.25",
      address: "0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C",
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      status: "completed",
      hash: "0x1c2e3b4a5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a",
    },
    {
      id: "4",
      type: "sent",
      amount: "0.05",
      address: "0x7EF2e0048f5bAeDe046f6BF797943daF4ED8CB47",
      timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      status: "pending",
      hash: "0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2",
    },
  ]

  currentFilter: "all" | "sent" | "received" = "all"

  get filteredTransactions(): Transaction[] {
    if (this.currentFilter === "all") return this.transactions
    return this.transactions.filter((tx) => tx.type === this.currentFilter)
  }

  filterTransactions(filter: "all" | "sent" | "received") {
    this.currentFilter = filter
  }
}
