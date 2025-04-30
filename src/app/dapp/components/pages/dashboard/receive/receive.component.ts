import { NotificationService } from './../../../../services/notificacion.service';
import { WalletService } from './../../../../services/wallet.service';
import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import QRCode from "qrcode"

@Component({
  selector: "app-receive",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./receive.component.html",
  styleUrls: ["./receive.component.css"],
})
export class ReceiveComponent implements OnInit {
  walletAddress = ""
  amount = ""
  network = ""
  chainId = ""
  symbol = "ETH"
  qrCodeDataUrl = ""
  paymentCode = ""
  showQR = true
  isGenerating = false
  copied = false

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit(): void {
    this.walletService.account$.subscribe((account) => {
      this.walletAddress = account || ""
      if (this.walletAddress) {
        this.generatePaymentInfo()
      }
    })

    this.walletService.network$.subscribe((network) => {
      this.network = network

      // Actualizar el símbolo según la red
      if (network.includes("Polygon")) {
        this.symbol = "MATIC"
      } else {
        this.symbol = "ETH"
      }

      // Regenerar el código si cambia la red
      if (this.walletAddress) {
        this.generatePaymentInfo()
      }
    })

    this.walletService.chainId$.subscribe((chainId) => {
      this.chainId = chainId

      // Regenerar el código si cambia el chainId
      if (this.walletAddress) {
        this.generatePaymentInfo()
      }
    })
  }

  async generatePaymentInfo(): Promise<void> {
    if (!this.walletAddress) {
      this.notificationService.showError("No hay una billetera conectada")
      return
    }

    this.isGenerating = true

    try {
      // Crear el código de pago en formato ethereum:<address>?value=<amount>&network=<network>&chainId=<chainId>
      const amountInWei = this.amount ? (Number.parseFloat(this.amount) * 1e18).toString() : ""

      // Construir los parámetros del código
      const params = []
      if (amountInWei) {
        params.push(`value=${amountInWei}`)
      }
      if (this.network) {
        params.push(`network=${encodeURIComponent(this.network)}`)
      }
      if (this.chainId) {
        params.push(`chainId=${this.chainId}`)
      }
      if (this.symbol) {
        params.push(`symbol=${encodeURIComponent(this.symbol)}`)
      }

      const queryString = params.length > 0 ? `?${params.join("&")}` : ""
      this.paymentCode = `ethereum:${this.walletAddress}${queryString}`

      // Generar el código QR
      this.qrCodeDataUrl = await QRCode.toDataURL(this.paymentCode, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
    } catch (error) {
      console.error("Error al generar el código QR:", error)
      this.notificationService.showError("Error al generar el código QR")
    } finally {
      this.isGenerating = false
    }
  }

  toggleDisplayMode(): void {
    this.showQR = !this.showQR
  }

  copyToClipboard(text: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        this.copied = true
        this.notificationService.showSuccess("Copiado al portapapeles")
        setTimeout(() => {
          this.copied = false
        }, 3000)
      },
      (err) => {
        console.error("Error al copiar:", err)
        this.notificationService.showError("Error al copiar al portapapeles")
      },
    )
  }

  downloadQR(): void {
    if (!this.qrCodeDataUrl) return

    const link = document.createElement("a")
    link.href = this.qrCodeDataUrl
    link.download = `criptopay-receive-${this.amount || "0"}-${this.symbol}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
