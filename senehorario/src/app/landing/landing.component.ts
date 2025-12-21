import { Component, OnInit, computed, inject } from "@angular/core";
import { ThemeService } from "../services/theme.service";

@Component({
  standalone: false,
  selector: "app-landing",
  templateUrl: "./landing.component.html",
  styleUrls: ["./landing.component.css"],
})
export class LandingComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  protected readonly theme = this.themeService.theme;
  protected readonly themeLabel = computed(() =>
    this.themeService.theme() === "dark" ? "Modo claro" : "Modo oscuro",
  );

  ngOnInit() {}

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  scrollToFaq(event: Event) {
    event.preventDefault();
    const faq = document.getElementById("faq");
    if (!faq) return;

    const yOffset = 32;
    const targetY = faq.getBoundingClientRect().top + window.scrollY - yOffset;
    window.scrollTo({
      top: targetY,
      behavior: "smooth",
    });
  }
}
