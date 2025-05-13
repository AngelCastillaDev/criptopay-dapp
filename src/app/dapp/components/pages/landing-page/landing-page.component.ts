import { WalletModalComponent } from "../conexion/wallet-modal/wallet-modal.component"
import { LoginModalComponent } from "../conexion/login-modal/login-modal.component"
import { Component, OnInit, HostListener } from "@angular/core"
import { CommonModule } from "@angular/common"

@Component({
  selector: "app-landing-page",
  standalone: true,
  imports: [CommonModule, LoginModalComponent, WalletModalComponent],
  templateUrl: "./landing-page.component.html",
  styleUrls: ["./landing-page.component.css"],
})
export class LandingPageComponent implements OnInit {
  showLoginModal = false
  showWalletModal = false
  selectedBlockchain = ""
  activeTab = "descripcion"
  isMobile = false
  showNetworkInfo = false
  currentNetworkIndex = 0
  networkInterval: any

  // Redes disponibles con sus iconos SVG
  networks = [
    { id: "ethereum", name: "Ethereum", color: "#627EEA" },
    { id: "sepolia", name: "Sepolia", color: "#9064FF" },
    { id: "goerli", name: "Goerli", color: "#F6C343" },
    { id: "holesky", name: "Holesky", color: "#5298FF" },
    { id: "polygon", name: "Polygon", color: "#8247E5" },
    { id: "mumbai", name: "Mumbai", color: "#8247E5" },
  ]

  // Equipo
  teamMembers = [
    {
      name: "Angel Gabriel Castilla Sandoval",
      role: "Desarrollador Blockchain",
      photo: "https://pjfcuropecvzfclpxgeq.supabase.co/storage/v1/object/public/criptopay//angel.jpg",
      description: "Especialista en desarrollo de contratos inteligentes y arquitectura blockchain.",
    },
    {
      name: "Erick Junior Flores Lizarbe",
      role: "Desarrollador Frontend",
      photo: "https://pjfcuropecvzfclpxgeq.supabase.co/storage/v1/object/public/criptopay//erick.jpeg",
      description: "Experto en interfaces de usuario y experiencia de usuario para aplicaciones Web3.",
    },
  ]

  ngOnInit() {
    // Inicialización del componente
    this.checkScreenSize()
    this.startNetworkRotation()
  }

  ngOnDestroy() {
    if (this.networkInterval) {
      clearInterval(this.networkInterval)
    }
  }

  startNetworkRotation() {
    this.networkInterval = setInterval(() => {
      this.currentNetworkIndex = (this.currentNetworkIndex + 1) % this.networks.length
    }, 3000)
  }

  @HostListener("window:resize", ["$event"])
  onResize() {
    // Detectar cambios en el tamaño de la pantalla para ajustes responsivos
    this.checkScreenSize()
  }

  checkScreenSize() {
    // Lógica para ajustes responsivos
    this.isMobile = window.innerWidth < 768
  }

  setActiveTab(tab: string) {
    this.activeTab = tab
  }

  toggleNetworkInfo() {
    this.showNetworkInfo = !this.showNetworkInfo
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: "smooth" })
    }
  }
  
  onSelectBlockchain(blockchain: string) {
    this.selectedBlockchain = blockchain
    this.showLoginModal = false

    if (blockchain) {
      setTimeout(() => {
        this.showWalletModal = true
      }, 300)
    }
  }
}
