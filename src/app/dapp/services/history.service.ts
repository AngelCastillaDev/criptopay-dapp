import { Injectable } from "@angular/core"
import { SupabaseService } from "./supabase.service"

export interface TransactionHistory {
    id?: string
    tx_hash: string
    from_address: string
    to_address: string
    amount: number
    note?: string
    timestamp?: string
    owner_wallet: string
    type: "sent" | "received" // ✅ nuevo campo obligatorio
}

@Injectable({
    providedIn: "root",
})
export class HistoryService {
    constructor(private supabase: SupabaseService) { }

    // 🔍 Listar historial por wallet
    async listHistory(ownerWallet: string): Promise<TransactionHistory[]> {
        const { data, error } = await this.supabase.client
            .from("transaction_history")
            .select("*")
            .eq("owner_wallet", ownerWallet)
            .order("timestamp", { ascending: false })

        if (error) throw error
        return data
    }

    // ➕ Agregar un nuevo registro al historial
    async addHistory(history: TransactionHistory): Promise<void> {
        try {
            // Asegurarse de que el campo type esté presente y sea válido
            if (!history.type || (history.type !== "sent" && history.type !== "received")) {
                history.type = history.from_address.toLowerCase() === history.owner_wallet.toLowerCase() ? "sent" : "received"
            }

            console.log(`Intentando guardar transacción ${history.tx_hash} para ${history.owner_wallet} como ${history.type}`)

            // Verificar si la transacción ya existe para este usuario y con este tipo
            const { data, error: checkError } = await this.supabase.client
                .from("transaction_history")
                .select("id")
                .eq("tx_hash", history.tx_hash)
                .eq("owner_wallet", history.owner_wallet)
                .eq("type", history.type)
                .maybeSingle()

            if (checkError) {
                console.error("Error al verificar transacción existente:", checkError)
                throw checkError
            }

            // Si la transacción no existe con este tipo para este usuario, insertarla
            if (!data) {
                console.log(`Insertando nueva transacción ${history.tx_hash} para ${history.owner_wallet} como ${history.type}`)

                const { error } = await this.supabase.client.from("transaction_history").insert([history])

                if (error) {
                    console.error("Error al insertar transacción:", error)
                    throw error
                }

                console.log(`Transacción guardada exitosamente`)
            } else {
                console.log(
                    `Transacción ${history.tx_hash} ya existe para ${history.owner_wallet} como ${history.type}, no se duplicará`,
                )
            }
        } catch (error) {
            console.error("Error en addHistory:", error)
            throw error
        }
    }
}
