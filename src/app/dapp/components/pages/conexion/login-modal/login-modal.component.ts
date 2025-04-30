import { Component, EventEmitter, Output } from "@angular/core";
import { CommonModule } from "@angular/common";

@Component({
  selector: "app-login-modal",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./login-modal.component.html",
  styleUrls: ["./login-modal.component.css"],
})
export class LoginModalComponent {
  @Output() close = new EventEmitter<void>();
  @Output() selectBlockchain = new EventEmitter<string>();
}
