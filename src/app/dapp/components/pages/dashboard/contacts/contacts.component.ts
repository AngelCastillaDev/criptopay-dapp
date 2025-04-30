import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"

interface Contact {
  id: number
  name: string
  address: string
  note?: string
}

@Component({
  selector: "app-contacts",
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex justify-between items-center">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white">Contactos</h2>
        <button 
          (click)="showAddContactForm = true"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg class="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
          </svg>
          Añadir Contacto
        </button>
      </div>
      
      <div *ngIf="showAddContactForm" class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:p-6">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Nuevo Contacto
          </h3>
          <form (submit)="addContact($event)" class="mt-5 space-y-4">
            <div>
              <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nombre
              </label>
              <input 
                type="text" 
                name="name" 
                id="name" 
                [(ngModel)]="newContact.name"
                class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                required
              />
            </div>
            
            <div>
              <label for="address" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Dirección Ethereum
              </label>
              <input 
                type="text" 
                name="address" 
                id="address" 
                [(ngModel)]="newContact.address"
                class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="0x..."
                required
              />
            </div>
            
            <div>
              <label for="note" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nota (opcional)
              </label>
              <textarea 
                name="note" 
                id="note" 
                [(ngModel)]="newContact.note"
                rows="3"
                class="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              ></textarea>
            </div>
            
            <div class="flex justify-end space-x-3">
              <button 
                type="button"
                (click)="cancelAddContact()"
                class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
              Lista de Contactos
            </h3>
            <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              {{ contacts.length }} contactos guardados
            </p>
          </div>
          
          <div class="relative">
            <input 
              type="text" 
              [(ngModel)]="searchTerm"
              placeholder="Buscar contactos..." 
              class="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            />
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <svg class="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div class="border-t border-gray-200 dark:border-gray-700">
          <div *ngIf="filteredContacts.length === 0" class="px-4 py-5 text-center text-gray-500 dark:text-gray-400">
            No se encontraron contactos.
          </div>
          
          <ul *ngIf="filteredContacts.length > 0" class="divide-y divide-gray-200 dark:divide-gray-700">
            <li *ngFor="let contact of filteredContacts" class="px-4 py-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-gray-700">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div class="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                    {{ contact.name.charAt(0).toUpperCase() }}
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ contact.name }}
                    </div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                      {{ contact.address | slice:0:10 }}...{{ contact.address | slice:-6 }}
                    </div>
                    <div *ngIf="contact.note" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {{ contact.note }}
                    </div>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button 
                    (click)="copyAddress(contact.address)"
                    class="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
                      <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 110 2h-2v-2z" />
                    </svg>
                  </button>
                  <button 
                    (click)="deleteContact(contact.id)"
                    class="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class ContactsComponent {
  contacts: Contact[] = [
    {
      id: 1,
      name: "Vitalik Buterin",
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      note: "Fundador de Ethereum",
    },
    { id: 2, name: "Satoshi Nakamoto", address: "0x1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", note: "Creador de Bitcoin" },
    { id: 3, name: "Gavin Wood", address: "0x4aE46Dc8693C7f5C19D3C06D1d9B974c9c992eB7", note: "Fundador de Polkadot" },
  ]

  showAddContactForm = false
  newContact: Partial<Contact> = {}
  searchTerm = ""

  get filteredContacts(): Contact[] {
    if (!this.searchTerm) return this.contacts

    const term = this.searchTerm.toLowerCase()
    return this.contacts.filter(
      (contact) =>
        contact.name.toLowerCase().includes(term) ||
        contact.address.toLowerCase().includes(term) ||
        (contact.note && contact.note.toLowerCase().includes(term)),
    )
  }

  addContact(event: Event) {
    event.preventDefault()

    if (!this.newContact.name || !this.newContact.address) return

    const newId = this.contacts.length > 0 ? Math.max(...this.contacts.map((c) => c.id)) + 1 : 1

    this.contacts.push({
      id: newId,
      name: this.newContact.name,
      address: this.newContact.address,
      note: this.newContact.note,
    })

    this.cancelAddContact()
  }

  cancelAddContact() {
    this.showAddContactForm = false
    this.newContact = {}
  }

  deleteContact(id: number) {
    if (confirm("¿Estás seguro de que deseas eliminar este contacto?")) {
      this.contacts = this.contacts.filter((contact) => contact.id !== id)
    }
  }

  copyAddress(address: string) {
    navigator.clipboard.writeText(address).then(() => {
      // Could show a toast notification here
      console.log("Dirección copiada al portapapeles")
    })
  }
}
