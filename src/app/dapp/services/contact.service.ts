import { Injectable } from '@angular/core'
import { SupabaseService } from './supabase.service'

export interface Contact {
    id?: string
    wallet_address: string
    name?: string
    owner_wallet: string
    created_at?: string
}

@Injectable({
    providedIn: 'root',
})
export class ContactService {
    constructor(private supabase: SupabaseService) { }

    // 🔍 Listar todos los contactos del usuario actual
    async listContacts(ownerWallet: string): Promise<Contact[]> {
        const { data, error } = await this.supabase.client
            .from('contacts')
            .select('*')
            .eq('owner_wallet', ownerWallet)
            .order('created_at', { ascending: false })

        if (error) throw error
        return data
    }

    // ➕ Agregar un nuevo contacto
    async addContact(contact: Contact): Promise<void> {
        const { error } = await this.supabase.client
            .from('contacts')
            .insert([contact])
        if (error) throw error
    }

    // 📝 Editar un contacto existente
    async updateContact(id: string, updates: Partial<Contact>): Promise<void> {
        const { error } = await this.supabase.client
            .from('contacts')
            .update(updates)
            .eq('id', id)
        if (error) throw error
    }

    // 🗑️ Eliminar un contacto por ID
    async deleteContact(id: string): Promise<void> {
        const { error } = await this.supabase.client
            .from('contacts')
            .delete()
            .eq('id', id)
        if (error) throw error
    }
}
