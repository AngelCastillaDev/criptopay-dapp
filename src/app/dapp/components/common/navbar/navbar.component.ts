import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { WalletService } from '../../../services/wallet.service';
import { NotificationService } from '../../../services/notificacion.service';

interface Network {
    name: string;
    chainId: string;
    icon: string;
    testnet: boolean;
}

@Component({
    selector: 'app-navbar',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './navbar.component.html',
    styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit {
    @Input() isMobile = false;

    currentTitle = 'Dashboard';
    showNetworkDropdown = false;
    currentNetwork = 'Ethereum';
    currentChainId = '0x1';
    isChangingNetwork = false;
    isLoggingOut = false;

    networks: Network[] = [
        { name: 'Ethereum', chainId: '0x1', icon: 'ethereum', testnet: false },
        { name: 'Sepolia', chainId: '0xaa36a7', icon: 'sepolia', testnet: true },
        { name: 'Goerli', chainId: '0x5', icon: 'goerli', testnet: true },
        { name: 'Holesky', chainId: '0x4268', icon: 'holesky', testnet: true },
        { name: 'Polygon', chainId: '0x89', icon: 'polygon', testnet: false },
        { name: 'Mumbai', chainId: '0x13881', icon: 'mumbai', testnet: true }
    ];

    constructor(
        private router: Router,
        private walletService: WalletService,
        private notificationService: NotificationService
    ) { }

    ngOnInit(): void {
        // Actualizar el título basado en la ruta actual
        this.router.events
            .pipe(filter(event => event instanceof NavigationEnd))
            .subscribe(() => {
                this.updateTitle();
            });

        // Inicializar el título
        this.updateTitle();

        // Suscribirse a los cambios de red desde el servicio
        this.walletService.network$.subscribe(network => {
            this.currentNetwork = network;
            console.log("Navbar: Network updated to", network);
        });

        // Obtener la red actual
        if (window.ethereum) {
            window.ethereum.request({ method: 'eth_chainId' })
                .then((chainId: string) => {
                    this.currentChainId = chainId;
                    this.updateNetworkName(chainId);
                })
                .catch(console.error);

            // Escuchar cambios de red
            window.ethereum.on('chainChanged', (chainId: string) => {
                console.log("Navbar: Chain changed to", chainId);
                this.currentChainId = chainId;
                this.updateNetworkName(chainId);
            });
        }
    }

    private updateTitle(): void {
        const url = this.router.url;

        if (url.includes('/dashboard/transaction')) {
            this.currentTitle = 'Realizar Transacción';
        } else if (url.includes('/dashboard/history')) {
            this.currentTitle = 'Historial de Transacciones';
        } else if (url.includes('/dashboard/contacts')) {
            this.currentTitle = 'Contactos';
        } else {
            this.currentTitle = 'Dashboard';
        }
    }

    private updateNetworkName(chainId: string): void {
        const network = this.networks.find(n => n.chainId === chainId);
        if (network) {
            this.currentNetwork = network.name;
        } else {
            this.currentNetwork = 'Red Desconocida';
        }
    }

    toggleNetworkDropdown(event: Event): void {
        event.stopPropagation();
        this.showNetworkDropdown = !this.showNetworkDropdown;
    }

    closeDropdown(): void {
        this.showNetworkDropdown = false;
    }

    async switchNetwork(chainId: string, networkName: string): Promise<void> {
        if (this.isChangingNetwork) return;

        this.isChangingNetwork = true;
        try {
            this.notificationService.showInfo(`Cambiando a red ${networkName}...`);
            await this.walletService.switchNetwork(chainId);
            this.showNetworkDropdown = false;

            // Esperar un momento y luego forzar la actualización del balance
            setTimeout(async () => {
                try {
                    await this.walletService.refreshBalance();
                    this.notificationService.showSuccess(`Red cambiada a ${networkName}`);
                } catch (error) {
                    console.error("Error refreshing balance after network change:", error);
                }
            }, 1500);

        } catch (error) {
            console.error("Error al cambiar de red:", error);
            this.notificationService.showError("Error al cambiar de red");
        } finally {
            this.isChangingNetwork = false;
        }
    }

    async logout() {
        this.isLoggingOut = true;

        try {
            // Disconnect from wallet service
            await this.walletService.disconnect();

            // Clear local storage
            localStorage.removeItem("walletConnected");

            // Show notification
            this.notificationService.showSuccess("Sesión cerrada correctamente");

            // Navigate to landing page
            this.router.navigate(["/"]);
        } catch (error) {
            console.error("Error during logout:", error);
            this.notificationService.showError("Error al cerrar sesión");
        } finally {
            this.isLoggingOut = false;
        }
    }

    // Obtener el icono de la red según su chainId
    getNetworkIcon(chainId: string): string {
        switch (chainId) {
            case "0x1": // Ethereum Mainnet
                return "ethereum";
            case "0xaa36a7": // Sepolia
                return "sepolia";
            case "0x5": // Goerli
                return "goerli";
            case "0x4268": // Holesky
                return "holesky";
            case "0x89": // Polygon
                return "polygon";
            case "0x13881": // Mumbai
                return "mumbai";
            default:
                return "unknown";
        }
    }
}