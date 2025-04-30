import { NotificationService } from './../../../../services/notificacion.service';
import { WalletService } from './../../../../services/wallet.service';
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, NgZone } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { Html5Qrcode, Html5QrcodeScannerState, Html5QrcodeSupportedFormats } from "html5-qrcode"

interface PaymentInfo {
  address: string
  amount?: string
  network?: string
  chainId?: string
  symbol?: string
}

@Component({
  selector: "app-send",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./send.component.html",
  styleUrls: ["./send.component.css"],
})
export class SendComponent implements OnInit, OnDestroy {
  @ViewChild("qrReader") qrReaderElement: ElementRef | undefined
  @ViewChild("fileSelector") fileSelector: ElementRef | undefined

  // Campos del formulario
  recipientAddress = ""
  amount = ""
  gasPrice = "21"
  balance = "0"
  symbol = "ETH"
  network = ""
  chainId = ""

  // Información del código escaneado
  scannedNetwork = ""
  scannedChainId = ""
  scannedSymbol = ""
  networkMismatch = false

  // Estados
  isLoading = false
  transactionHash = ""
  errorMessage = ""
  showScanner = false
  isScanning = false
  manualCode = ""
  showConfirmation = false
  cameraPermissionDenied = false
  scannerInitialized = false
  scannerError = ""
  isProcessingImage = false
  scanGuideVisible = true

  // Escáner QR
  html5QrCode: Html5Qrcode | null = null
  cameraId = ""
  availableCameras: Array<{ id: string; label: string }> = []

  constructor(
    private walletService: WalletService,
    private notificationService: NotificationService,
    private ngZone: NgZone,
  ) { }

  ngOnInit(): void {
    this.walletService.balance$.subscribe((balance) => {
      this.balance = balance
    })

    this.walletService.network$.subscribe((network) => {
      this.network = network

      // Actualizar el símbolo según la red
      if (network.includes("Polygon")) {
        this.symbol = "MATIC"
      } else {
        this.symbol = "ETH"
      }

      // Verificar si hay discrepancia con la red escaneada
      this.checkNetworkMismatch()
    })

    this.walletService.chainId$.subscribe((chainId) => {
      this.chainId = chainId

      // Verificar si hay discrepancia con la red escaneada
      this.checkNetworkMismatch()
    })
  }

  ngOnDestroy(): void {
    this.stopScanner()
  }

  // Verificar si hay discrepancia entre la red actual y la red escaneada
  checkNetworkMismatch(): void {
    if (this.scannedChainId && this.chainId) {
      this.networkMismatch = this.scannedChainId !== this.chainId
    } else {
      this.networkMismatch = false
    }
  }

  // Cambiar a la red especificada en el código escaneado
  async switchToScannedNetwork(): Promise<void> {
    if (!this.scannedChainId) {
      this.notificationService.showError("No se especificó una red en el código escaneado")
      return
    }

    try {
      await this.walletService.switchNetwork(this.scannedChainId)
      this.notificationService.showSuccess(`Red cambiada a ${this.scannedNetwork || "la red requerida"}`)
      this.networkMismatch = false
    } catch (error) {
      console.error("Error al cambiar de red:", error)
      this.notificationService.showError("No se pudo cambiar a la red especificada")
    }
  }

  // Validación de cantidad
  isValidAmount(): boolean {
    return Number.parseFloat(this.amount) > 0 && Number.parseFloat(this.amount) <= Number.parseFloat(this.balance)
  }

  // Enviar transacción
  async sendTransaction(event?: Event): Promise<void> {
    if (event) {
      event.preventDefault()
    }

    if (!this.isValidAmount()) {
      this.errorMessage = "Cantidad inválida. Asegúrate de tener suficiente balance."
      return
    }

    // Advertir si hay discrepancia de red
    if (this.networkMismatch) {
      this.notificationService.showError("Debes cambiar a la red correcta antes de enviar")
      return
    }

    this.isLoading = true
    this.errorMessage = ""
    this.transactionHash = ""
    this.showConfirmation = false

    try {
      const txHash = await this.walletService.sendTransaction(this.recipientAddress, this.amount)
      this.transactionHash = txHash
      this.notificationService.showSuccess("Transacción enviada correctamente")

      // Limpiar formulario después de enviar
      this.resetForm()
    } catch (error: any) {
      this.errorMessage = error.message || "Error al enviar la transacción"
      this.notificationService.showError(this.errorMessage)
    } finally {
      this.isLoading = false
    }
  }

  // Resetear formulario
  resetForm(): void {
    this.recipientAddress = ""
    this.amount = ""
    this.showConfirmation = false
    this.manualCode = ""
    this.scannedNetwork = ""
    this.scannedChainId = ""
    this.scannedSymbol = ""
    this.networkMismatch = false
  }

  // Mostrar/ocultar escáner
  toggleScanner(): void {
    if (this.showScanner) {
      this.stopScanner()
      this.showScanner = false
    } else {
      this.showScanner = true
      this.cameraPermissionDenied = false
      this.scannerError = ""
      this.scanGuideVisible = true

      // Inicializar el escáner después de que la vista se haya actualizado
      setTimeout(() => {
        this.initScanner()
      }, 100)
    }
  }

  // Inicializar escáner QR
  async initScanner(): Promise<void> {
    if (this.scannerInitialized) return

    try {
      // Crear el contenedor para el escáner si no existe
      const qrContainer = document.getElementById("qr-reader")
      if (!qrContainer) {
        console.error("No se encontró el contenedor del escáner QR")
        this.scannerError = "Error al inicializar el escáner: contenedor no encontrado"
        return
      }

      // Limpiar el contenedor
      qrContainer.innerHTML = ""

      // Crear una nueva instancia del escáner con soporte para todos los formatos
      this.html5QrCode = new Html5Qrcode("qr-reader", {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })

      // Obtener cámaras disponibles
      const devices = await Html5Qrcode.getCameras()

      if (devices && devices.length) {
        this.ngZone.run(() => {
          this.availableCameras = devices
          this.cameraId = devices[0].id
          this.startScanner()
          this.scannerInitialized = true
        })
      } else {
        this.ngZone.run(() => {
          this.scannerError = "No se detectaron cámaras en el dispositivo"
          this.notificationService.showError("No se encontraron cámaras disponibles")
        })
      }
    } catch (error: any) {
      console.error("Error al inicializar el escáner:", error)

      this.ngZone.run(() => {
        if (error.name === "NotAllowedError") {
          this.cameraPermissionDenied = true
          this.scannerError = "Permiso de cámara denegado. Por favor, permite el acceso a la cámara."
        } else {
          this.scannerError = `Error al inicializar el escáner: ${error.message || "Error desconocido"}`
        }
        this.notificationService.showError(this.scannerError)
      })
    }
  }

  // Iniciar escáner con la cámara seleccionada
  startScanner(): void {
    if (!this.html5QrCode || !this.cameraId) {
      this.scannerError = "No se pudo iniciar el escáner: escáner no inicializado"
      return
    }

    this.isScanning = true
    this.scannerError = ""

    // Configuración mejorada para mejor detección
    const config = {
      fps: 15, // Mayor velocidad de fotogramas
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true, // Usar detector de códigos de barras nativo si está disponible
      },
    }

    this.html5QrCode
      .start(
        this.cameraId,
        config,
        (decodedText) => {
          this.ngZone.run(() => {
            this.onScanSuccess(decodedText)
          })
        },
        (errorMessage) => {
          // No mostrar errores durante el escaneo normal
          // console.log(errorMessage)
        },
      )
      .catch((err) => {
        console.error("Error al iniciar el escáner:", err)

        this.ngZone.run(() => {
          this.isScanning = false
          if (err.name === "NotAllowedError") {
            this.cameraPermissionDenied = true
            this.scannerError = "Permiso de cámara denegado. Por favor, permite el acceso a la cámara."
          } else {
            this.scannerError = `Error al iniciar la cámara: ${err.message || "Error desconocido"}`
          }
          this.notificationService.showError(this.scannerError)
        })
      })
  }

  // Detener escáner
  stopScanner(): void {
    if (this.html5QrCode) {
      // Verificar si el escáner está en ejecución antes de intentar detenerlo
      if (this.html5QrCode.getState() === Html5QrcodeScannerState.SCANNING) {
        this.html5QrCode
          .stop()
          .then(() => {
            this.isScanning = false
            this.scannerInitialized = false
          })
          .catch((err) => {
            console.error("Error al detener el escáner:", err)
          })
      } else {
        this.isScanning = false
        this.scannerInitialized = false
      }
    }
  }

  // Cambiar cámara
  changeCamera(cameraId: string): void {
    if (this.isScanning) {
      this.stopScanner()
    }
    this.cameraId = cameraId
    setTimeout(() => {
      this.startScanner()
    }, 100)
  }

  // Solicitar permisos de cámara manualmente
  requestCameraPermission(): void {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => {
        this.cameraPermissionDenied = false
        this.initScanner()
      })
      .catch((error) => {
        console.error("Error al solicitar permisos de cámara:", error)
        this.cameraPermissionDenied = true
        this.scannerError =
          "No se pudo obtener acceso a la cámara. Verifica la configuración de permisos de tu navegador."
        this.notificationService.showError(this.scannerError)
      })
  }

  // Abrir selector de archivos
  openFileSelector(): void {
    if (this.fileSelector) {
      this.fileSelector.nativeElement.click()
    }
  }

  // Procesar imagen seleccionada
  // Procesar imagen seleccionada
  handleFileInput(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];

      // Verificar que sea una imagen
      if (!file.type.match("image.*")) {
        this.notificationService.showError("Por favor selecciona un archivo de imagen válido");
        return;
      }

      this.isProcessingImage = true;

      // Procesar la imagen con el escáner QR
      if (this.html5QrCode) {
        this.html5QrCode
          .scanFile(file, true)
          .then((decodedText) => {
            this.ngZone.run(() => {
              this.isProcessingImage = false;
              this.processPaymentCode(decodedText);
            });
          })
          .catch((error) => {
            this.ngZone.run(() => {
              this.isProcessingImage = false;
              console.error("Error al escanear la imagen:", error);
              this.notificationService.showError("No se pudo detectar un código QR válido en la imagen");
            });
          });
      } else {
        // Si el escáner no está inicializado, inicializarlo primero
        this.initScanner().then(() => {
          if (this.html5QrCode) {
            this.html5QrCode
              .scanFile(file, true)
              .then((decodedText) => {
                this.ngZone.run(() => {
                  this.isProcessingImage = false;
                  this.processPaymentCode(decodedText);
                });
              })
              .catch((error) => {
                this.ngZone.run(() => {
                  this.isProcessingImage = false;
                  console.error("Error al escanear la imagen:", error);
                  this.notificationService.showError("No se pudo detectar un código QR válido en la imagen");
                });
              });
          }
        });
      }
    }
  }

  // Alternar visibilidad de la guía de escaneo
  toggleScanGuide(): void {
    this.scanGuideVisible = !this.scanGuideVisible
  }

  // Procesar código QR escaneado
  onScanSuccess(decodedText: string): void {
    this.stopScanner()
    this.showScanner = false
    this.processPaymentCode(decodedText)
  }

  // Procesar código ingresado manualmente
  processManualCode(): void {
    if (!this.manualCode) {
      this.notificationService.showError("Por favor ingresa un código de pago")
      return
    }

    this.processPaymentCode(this.manualCode)
  }

  // Procesar código de pago (desde QR o manual)
  processPaymentCode(code: string): void {
    try {
      // Validar formato ethereum:<address>?value=<amount>&network=<network>&chainId=<chainId>
      if (!code.startsWith("ethereum:")) {
        throw new Error("Código de pago inválido. Debe comenzar con 'ethereum:'")
      }

      const paymentInfo = this.parsePaymentCode(code)

      if (!paymentInfo.address) {
        throw new Error("No se pudo extraer la dirección del código")
      }

      // Actualizar formulario con la información extraída
      this.recipientAddress = paymentInfo.address

      if (paymentInfo.amount) {
        this.amount = paymentInfo.amount
      }

      // Guardar información de la red del código
      if (paymentInfo.network) {
        this.scannedNetwork = paymentInfo.network
      }

      if (paymentInfo.chainId) {
        this.scannedChainId = paymentInfo.chainId
        // Verificar si hay discrepancia con la red actual
        this.checkNetworkMismatch()
      }

      if (paymentInfo.symbol) {
        this.scannedSymbol = paymentInfo.symbol
      }

      // Mostrar confirmación
      this.showConfirmation = true
      this.notificationService.showSuccess("Código de pago procesado correctamente")

      // Notificar si hay discrepancia de red
      if (this.networkMismatch) {
        this.notificationService.showInfo(
          `Este pago debe realizarse en la red ${this.scannedNetwork || "especificada en el código"}`,
        )
      }
    } catch (error: any) {
      console.error("Error al procesar el código:", error)
      this.notificationService.showError(error.message || "Error al procesar el código de pago")
    }
  }

  // Parsear código de pago
  parsePaymentCode(code: string): PaymentInfo {
    // Formato: ethereum:<address>?value=<amount>&network=<network>&chainId=<chainId>&symbol=<symbol>
    const addressMatch = code.match(/ethereum:([a-fA-F0-9x]+)/)

    // Extraer parámetros de la URL
    let url: URL
    try {
      // Crear una URL para facilitar el parsing de los parámetros
      url = new URL(code.replace("ethereum:", "https://ethereum.org/"))
    } catch (error) {
      console.error("Error al parsear la URL:", error)
      url = new URL("https://ethereum.org/")
    }

    const address = addressMatch ? addressMatch[1] : ""
    let amount = ""
    let network = ""
    let chainId = ""
    let symbol = ""

    // Extraer valor (amount)
    const valueParam = url.searchParams.get("value")
    if (valueParam) {
      // Convertir de wei a ETH
      const amountWei = Number.parseInt(valueParam, 10)
      amount = (amountWei / 1e18).toString()
    }

    // Extraer red (network)
    const networkParam = url.searchParams.get("network")
    if (networkParam) {
      network = decodeURIComponent(networkParam)
    }

    // Extraer chainId
    const chainIdParam = url.searchParams.get("chainId")
    if (chainIdParam) {
      chainId = chainIdParam
    }

    // Extraer símbolo
    const symbolParam = url.searchParams.get("symbol")
    if (symbolParam) {
      symbol = decodeURIComponent(symbolParam)
    }

    return { address, amount, network, chainId, symbol }
  }

  // Obtener el explorador de bloques según la red
  getBlockExplorer(): string {
    switch (this.chainId) {
      case "0x1": // Ethereum Mainnet
        return "https://etherscan.io/tx/"
      case "0xaa36a7": // Sepolia
        return "https://sepolia.etherscan.io/tx/"
      case "0x5": // Goerli
        return "https://goerli.etherscan.io/tx/"
      case "0x4268": // Holesky
        return "https://holesky.etherscan.io/tx/"
      case "0x89": // Polygon
        return "https://polygonscan.com/tx/"
      case "0x13881": // Mumbai
        return "https://mumbai.polygonscan.com/tx/"
      default:
        return "https://etherscan.io/tx/"
    }
  }
}
