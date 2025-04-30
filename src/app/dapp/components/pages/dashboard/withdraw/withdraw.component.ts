import { WalletService } from './../../../../services/wallet.service';
import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"

@Component({
  selector: "app-withdraw",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-2xl mx-auto">
      <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Retirar Fondos
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Retira ETH a una cuenta externa.
          </p>
        </div>
        
        <div class="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
          <form (submit)="withdraw($event)">
            <div class="space-y-6">
              <div>
                <label for="amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cantidad a Retirar (ETH)
                </label>
                <div class="mt-1 relative rounded-md shadow-sm">
                  <input 
                    type="number" 
                    name="amount" 
                    id="amount" 
                    [(ngModel)]="amount"
                    class="focus:ring-blue-500 focus:border-blue-500 block w-full pr-12 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="0.00"
                    step="0.001"
                    min="0"
                    required
                  />
                  <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span class="text-gray-500 dark:text-gray-400 sm:text-sm">
                      ETH
                    </span>
                  </div>
                </div>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Balance disponible: {{ balance }} ETH
                </p>
              </div>
              
              <div>
                <label for="destination" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Dirección de Destino
                </label>
                <div class="mt-1">
                  <input 
                    type="text" 
                    name="destination" 
                    id="destination" 
                    [(ngModel)]="destinationAddress"
                    class="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="0x..."
                    required
                  />
                </div>
              </div>
              
              <div>
                <label for="network" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Red
                </label>
                <select 
                  id="network" 
                  name="network" 
                  [(ngModel)]="selectedNetwork"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  <option value="ethereum">Ethereum Mainnet</option>
                  <option value="polygon">Polygon</option>
                  <option value="optimism">Optimism</option>
                  <option value="arbitrum">Arbitrum</option>
                </select>
              </div>
              
              <div class="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 dark:border-yellow-600 p-4">
                <div class="flex">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-yellow-400 dark:text-yellow-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="ml-3">
                    <p class="text-sm text-yellow-700 dark:text-yellow-200">
                      Asegúrate de que la dirección de destino sea correcta. Las transacciones en blockchain son irreversibles.
                    </p>
                  </div>
                </div>
              </div>
              
              <div class="flex justify-end">
                <button 
                  type="submit" 
                  [disabled]="isLoading || !isValidAmount()"
                  class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg *ngIf="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retirar Fondos
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
      
      <div *ngIf="transactionHash" class="mt-6 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-green-800 dark:text-green-200">
              Retiro iniciado
            </h3>
            <div class="mt-2 text-sm text-green-700 dark:text-green-300">
              <p>Hash de la transacción: {{ transactionHash | slice:0:10 }}...{{ transactionHash | slice:-6 }}</p>
            </div>
            <div class="mt-4">
              <div class="-mx-2 -my-1.5 flex">
                <a [href]="'https://etherscan.io/tx/' + transactionHash" target="_blank" class="bg-green-100 dark:bg-green-800 px-2 py-1.5 rounded-md text-sm font-medium text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Ver en Etherscan
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div *ngIf="errorMessage" class="mt-6 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-md p-4">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <h3 class="text-sm font-medium text-red-800 dark:text-red-200">
              Error en el retiro
            </h3>
            <div class="mt-2 text-sm text-red-700 dark:text-red-300">
              <p>{{ errorMessage }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class WithdrawComponent {
  amount = ""
  destinationAddress = ""
  selectedNetwork = "ethereum"
  balance = "0"
  isLoading = false
  transactionHash = ""
  errorMessage = ""

  constructor(private walletService: WalletService) {
    this.walletService.balance$.subscribe((balance) => {
      this.balance = balance
    })
  }

  isValidAmount(): boolean {
    return Number.parseFloat(this.amount) > 0 && Number.parseFloat(this.amount) <= Number.parseFloat(this.balance)
  }

  async withdraw(event: Event) {
    event.preventDefault()

    if (!this.isValidAmount()) {
      this.errorMessage = "Cantidad inválida. Asegúrate de tener suficiente balance."
      return
    }

    this.isLoading = true
    this.errorMessage = ""
    this.transactionHash = ""

    try {
      const txHash = await this.walletService.sendTransaction(this.destinationAddress, this.amount)
      this.transactionHash = txHash
      this.amount = ""
      this.destinationAddress = ""
    } catch (error: any) {
      this.errorMessage = error.message || "Error al procesar el retiro"
    } finally {
      this.isLoading = false
    }
  }
}
