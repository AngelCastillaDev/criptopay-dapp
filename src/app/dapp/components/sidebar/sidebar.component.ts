import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router } from "@angular/router";
import { WalletService } from "../../services/wallet.service";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

interface NavItem {
  label: string;
  route: string;
  icon: SafeHtml;
}

@Component({
  selector: "app-sidebar",
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: "./sidebar.component.html",
  styleUrls: ["./sidebar.component.css"],
})
export class SidebarComponent {
  @Input() isMobile = false;
  @Output() sidebarToggled = new EventEmitter<boolean>();

  isOpen = true;
  walletAddress = "";
  balance = "0";

  navItems: NavItem[] = [];

  constructor(
    private walletService: WalletService,
    private router: Router,
    private sanitizer: DomSanitizer // ⬅️ Inyectar
  ) {
    this.walletService.account$.subscribe((account) => {
      this.walletAddress = account || "";
    });

    this.walletService.balance$.subscribe((balance) => {
      this.balance = balance;
    });

    // Aquí inicializamos los íconos asegurados
    this.navItems = [
      {
        label: "Dashboard",
        route: "/dashboard",
        icon: this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>`
        ),
      },
      {
        label: "Enviar Pago",
        route: "/dashboard/send",
        icon: this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>`
        ),
      },
      {
        label: "Recibir Pago",
        route: "/dashboard/receive",
        icon: this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>`
        ),
      },
      {
        label: "Contactos",
        route: "/dashboard/contacts",
        icon: this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>`
        ),
      },
      {
        label: "Historial",
        route: "/dashboard/history",
        icon: this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>`
        ),
      },
      {
        label: "Retirar",
        route: "/dashboard/withdraw",
        icon: this.sanitizer.bypassSecurityTrustHtml(
          `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>`
        ),
      },
    ];
  }

  toggleSidebar() {
    this.isOpen = !this.isOpen;
    this.sidebarToggled.emit(this.isOpen);
  }

  logout() {
    this.walletService.disconnect();
    localStorage.removeItem("walletConnected");
    this.router.navigate(["/"]);
  }
}
