import { Contact } from './../../../../../services/contact.service';
import { Component, EventEmitter, Input, type OnInit, Output } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"

@Component({
    selector: "app-contact-modal",
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: "./contact-modal.component.html",
    styleUrls: ["./contact-modal.component.css"],
})
export class ContactModalComponent implements OnInit {
    @Input() mode: "add" | "edit" = "add"
    @Input() contact: Contact | null = null
    @Input() currentWallet = ""
    @Output() close = new EventEmitter<void>()
    @Output() save = new EventEmitter<Contact>()

    contactForm: FormGroup
    isSubmitting = false

    constructor(private fb: FormBuilder) {
        this.contactForm = this.fb.group({
            name: ["", [Validators.required, Validators.maxLength(50)]],
            wallet_address: ["", [Validators.required, Validators.pattern(/^0x[a-fA-F0-9]{40}$/)]],
        })
    }

    ngOnInit(): void {
        // Si estamos en modo edición, inicializar el formulario con los datos del contacto
        if (this.mode === "edit" && this.contact) {
            this.contactForm.patchValue({
                name: this.contact.name,
                wallet_address: this.contact.wallet_address,
            })
        }
    }

    onSubmit(): void {
        if (this.contactForm.invalid || this.isSubmitting) {
            // Marcar todos los campos como tocados para mostrar errores
            Object.keys(this.contactForm.controls).forEach((key) => {
                const control = this.contactForm.get(key)
                control?.markAsTouched()
            })
            return
        }

        this.isSubmitting = true

        const contactData: Contact = {
            name: this.contactForm.value.name,
            wallet_address: this.contactForm.value.wallet_address,
            owner_wallet: this.currentWallet,
        }

        // Si estamos editando, mantener el ID y otros campos
        if (this.mode === "edit" && this.contact) {
            contactData.id = this.contact.id
            contactData.created_at = this.contact.created_at
        }

        this.save.emit(contactData)
    }

    onCancel(): void {
        this.close.emit()
    }

    // Helpers para validación de formularios
    get nameControl() {
        return this.contactForm.get("name")
    }
    get walletAddressControl() {
        return this.contactForm.get("wallet_address")
    }

    hasError(controlName: string, errorName: string): boolean {
        const control = this.contactForm.get(controlName)
        return !!(control && control.touched && control.hasError(errorName))
    }

    get modalTitle(): string {
        return this.mode === "add" ? "Añadir Nuevo Contacto" : "Editar Contacto"
    }

    get submitButtonText(): string {
        return this.mode === "add" ? "Guardar Contacto" : "Actualizar Contacto"
    }
}
