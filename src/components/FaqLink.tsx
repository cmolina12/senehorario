"use client";

export function FaqLink() {
  const scrollToFaq = (event: React.MouseEvent) => {
    event.preventDefault();
    const faq = document.getElementById("faq");
    if (!faq) return;
    const yOffset = 32;
    const targetY = faq.getBoundingClientRect().top + window.scrollY - yOffset;
    window.scrollTo({ top: targetY, behavior: "smooth" });
  };

  return (
    <a className="header-link" href="#faq" onClick={scrollToFaq}>
      FAQ
    </a>
  );
}
