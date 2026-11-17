"use client";

import { useState } from "react";
import { CONTACT_EMAIL } from "@/content/contact";
import { copyText } from "@/lib/clipboard";

/**
 * The contact address, shown in full: mailto links often open nothing (no
 * mail app set up), so it can also be copied.
 */
export function ContactEmail() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!(await copyText(CONTACT_EMAIL))) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <span className="contact-email">
      <a href={`mailto:${CONTACT_EMAIL}`} className="contact-email-address">
        <i className="bi bi-envelope" aria-hidden="true"></i>
        {CONTACT_EMAIL}
      </a>
      <button
        type="button"
        onClick={copy}
        className={`contact-email-copy${copied ? " is-copied" : ""}`}
        aria-label={copied ? "Correo copiado" : "Copiar correo"}
        title={copied ? "Copiado" : "Copiar"}
      >
        <i className={`bi ${copied ? "bi-check-lg" : "bi-copy"}`} aria-hidden="true"></i>
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Correo copiado" : ""}
      </span>
    </span>
  );
}
