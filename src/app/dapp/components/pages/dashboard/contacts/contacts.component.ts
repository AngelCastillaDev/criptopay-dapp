import { WalletService } from './../../../../services/wallet.service';
import { Component, type OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { ContactService, Contact } from "./../../../../services/contact.service"
import { ContactModalComponent } from "./contact-modal/contact-modal.component"
import Swal from 'sweetalert2';

@Component({
  selector: "app-contacts",
  standalone: true,
  imports: [CommonModule, FormsModule, ContactModalComponent],
  templateUrl: "./contacts.component.html",
  styleUrls: ["./contacts.component.css"],
})
export class ContactsComponent implements OnInit {
  contacts: Contact[] = []
  filteredContacts: Contact[] = []
  searchTerm = ""
  isLoading = true
  showModal = false
  currentWallet = ""
  selectedContact: Contact | null = null
  modalMode: "add" | "edit" = "add"

  constructor(
    private walletService: WalletService,
    private contactService: ContactService,
  ) { }

  ngOnInit(): void {
    // Obtener la wallet actual
    this.walletService.account$.subscribe((wallet) => {
      if (wallet) {
        this.currentWallet = wallet
        this.loadContacts()
      }
    })
  }

  async loadContacts(): Promise<void> {
    this.isLoading = true
    try {
      this.contacts = await this.contactService.listContacts(this.currentWallet)
      this.applyFilter()
      this.isLoading = false
    } catch (error) {
      console.error("Error al cargar contactos:", error)
      this.showErrorNotification("No se pudieron cargar los contactos")
      this.isLoading = false
    }
  }

  applyFilter(): void {
    if (!this.searchTerm) {
      this.filteredContacts = [...this.contacts]
      return
    }

    const term = this.searchTerm.toLowerCase()
    this.filteredContacts = this.contacts.filter(
      (contact) => contact.name?.toLowerCase().includes(term) || contact.wallet_address.toLowerCase().includes(term),
    )
  }

  onSearch(): void {
    this.applyFilter()
  }

  openAddModal(): void {
    this.modalMode = "add"
    this.selectedContact = null
    this.showModal = true
  }

  openEditModal(contact: Contact): void {
    this.modalMode = "edit"
    this.selectedContact = contact
    this.showModal = true
  }

  closeModal(): void {
    this.showModal = false
    this.selectedContact = null
  }

  async onContactSaved(contact: Contact): Promise<void> {
    try {
      if (this.modalMode === "add") {
        await this.contactService.addContact({
          ...contact,
          owner_wallet: this.currentWallet,
        })
        this.showSuccessNotification("Contacto agregado correctamente")
      } else {
        if (!this.selectedContact?.id) return
        await this.contactService.updateContact(this.selectedContact.id, contact)
        this.showSuccessNotification("Contacto actualizado correctamente")
      }

      this.loadContacts()
      this.closeModal()
    } catch (error) {
      console.error(`Error al ${this.modalMode === "add" ? "agregar" : "actualizar"} contacto:`, error)
      this.showErrorNotification(`No se pudo ${this.modalMode === "add" ? "agregar" : "actualizar"} el contacto`)
    }
  }

  async deleteContact(contact: Contact): Promise<void> {
    if (!contact.id) return

    // Usar SweetAlert2 para confirmar la eliminación
    const result = await Swal.fire({
      title: "¿Eliminar contacto?",
      text: `¿Estás seguro de que deseas eliminar a ${contact.name || "este contacto"}? Esta acción no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    })

    if (result.isConfirmed) {
      try {
        await this.contactService.deleteContact(contact.id)
        this.showSuccessNotification("Contacto eliminado correctamente")
        this.loadContacts()
      } catch (error) {
        console.error("Error al eliminar contacto:", error)
        this.showErrorNotification("No se pudo eliminar el contacto")
      }
    }
  }

  copyAddress(address: string): void {
    navigator.clipboard.writeText(address).then(() => {
      this.showInfoNotification("Dirección copiada al portapapeles")
    })
  }

  // Notificaciones con SweetAlert2
  showSuccessNotification(message: string): void {
    Swal.fire({
      title: "¡Éxito!",
      text: message,
      icon: "success",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  }

  showErrorNotification(message: string): void {
    Swal.fire({
      title: "Error",
      text: message,
      icon: "error",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
    })
  }

  showInfoNotification(message: string): void {
    Swal.fire({
      title: "Info",
      text: message,
      icon: "info",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
    })
  }

  // Método para obtener las iniciales del nombre
  getInitials(name: string | undefined): string {
    if (!name) return "?"
    return name.charAt(0).toUpperCase()
  }

  // Método para formatear la dirección de wallet
  formatAddress(address: string): string {
    if (!address) return ""
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
}
