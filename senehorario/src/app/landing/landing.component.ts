import { Component, OnInit } from "@angular/core";

@Component({
  standalone: false,
  selector: "app-landing",
  templateUrl: "./landing.component.html",
  styleUrls: ["./landing.component.css"],
})
export class LandingComponent implements OnInit {
  constructor() {}

  ngOnInit() {}

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
