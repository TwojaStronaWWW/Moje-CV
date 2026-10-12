# Krzysztof Początek – Oficjalne CV & Portfolio IT

[![CI/CD Pipeline](https://img.shields.io/badge/CI%2FCD%20Pipeline-Passing-success?style=flat-square&logo=githubactions)](.github/workflows/deploy.yml)
[![Unit Tests](https://img.shields.io/badge/Unit%20Tests-56%20Passed-blue?style=flat-square&logo=node.js)](tests/)
[![Code Coverage](https://img.shields.io/badge/Coverage-%3E86%25-brightgreen?style=flat-square)](tests/)
[![Lighthouse CI](https://img.shields.io/badge/Lighthouse-Validated-success?style=flat-square&logo=lighthouse)](.lighthouserc.json)
[![Security](https://img.shields.io/badge/Security-Dependabot%20Active-blue?style=flat-square&logo=dependabot)](.github/dependabot.yml)
[![Standards](https://img.shields.io/badge/Standards-ISO%2F27001%20%7C%20WCAG%202.1-informational?style=flat-square)](AGENTS.md)

Oficjalne, produkcyjne repozytorium interaktywnego CV oraz portfolio zawodowego **Krzysztofa Początka** (Specjalista IT, Wdrożeniowiec systemów medycznych AMMS/KS-SOMED, Certyfikowany Audytor Wewnętrzny ISO/IEC 27001:2023, ITIL® 4 Foundation).

Projekt zaprojektowany zgodnie z rygorem inżynierskim klasy Enterprise, wzorowany na architekturze CI/CD i standardach testów aplikacji **Gal Anonim**.

---

## 🏛️ Architektura i Standardy Techniczne

* **Zero-Dependency Runtime**: Czysty, semantyczny HTML5, nowoczesny Vanilla CSS3 zoptymalizowany pod A4 oraz Vanilla JavaScript (ES6+). Zero zewnętrznych ciężkich frameworków, błyskawiczne ładowanie.
* **Dostępność i UX (WCAG 2.1)**:
  - Pełna obsługa nawigacji klawiaturą (zamykanie menu klawiszem `Escape` z przywracaniem fokusu).
  - Płynna responsywność (automatyczny reset menu przy obrocie urządzenia lub zmianie szerokości okna > 768px).
  - Precyzyjne atrybuty ARIA (`aria-expanded`, `aria-controls`, `aria-label`).
* **Format Wydruku A4 i PDF**: Dedykowany arkusz `assets/css/print.css` z precyzyjnymi regułami `@page`, `.page-break-before` i ochroną przed rozrywaniem wpisów doświadczenia zawodowego.
* **SEO & Social Graph**: Kompletne tagi Open Graph, Twitter Cards, kanoniczne linki URL, `robots.txt`, `sitemap.xml` oraz strukturyzowane dane Schema.org (JSON-LD) dla typu `Person`.

---

## 🚀 Trójstopniowy Pipeline CI/CD (.github/workflows/deploy.yml)

Pipeline uruchamia się na każdym pushu do gałęzi `main`, weryfikuje Pull Requesty oraz pozwala na ręczne wywołanie (`workflow_dispatch`):

```
┌─────────────────────────────────┐
│ 1. Quality Gate & Testy         │
│    • Weryfikacja składni JS     │
│    • 50+ testów jednostkowych   │
│    • Raport pokrycia (Coverage) │
└────────────────┬────────────────┘
                 │ (needs: [test])
                 ▼
┌─────────────────────────────────┐
│ 2. Budowa PDF & Lighthouse CI   │
│    • Headless Chromium Print    │
│    • Upload artefaktu PDF (GH)  │
│    • Audyt a11y, SEO, Best-Pr.  │
└────────────────┬────────────────┘
                 │ (needs: [build-and-audit], if: main)
                 ▼
┌─────────────────────────────────┐
│ 3. Wdrożenie Produkcyjne (LH)   │
│    • Transfer SFTP (HTML + PDF) │
│    • krzysztofpoczatek.pl       │
└─────────────────────────────────┘
```

---

## 🧪 Zestaw Testów Jednostkowych i Integralności

Wszystkie testy działają w oparciu o natywny silnik `node:test` i `node:assert/strict` w Node.js (bez zewnętrznych bibliotek npm, czas wykonania: **<200 ms**):

| Plik testowy | Obszar testowany |
| :--- | :--- |
| `tests/unit/main.test.js` | Logika UI, zamykanie menu (ESC, kliknięcie poza, kliknięcie w link, resize > 768px), idempotencja, druk. |
| `tests/unit/html-integrity.test.js` | Semantyka HTML5, unikalny `<h1>`, SEO, Open Graph, Twitter Card, walidacja Schema.org JSON-LD. |
| `tests/unit/css-integrity.test.js` | Walidacja składni CSS, zbalansowanie nawiasów `{}`, spójność zmiennych `:root`. |
| `tests/unit/print-css.test.js` | Reguły wydruku A4 portrait, `print-color-adjust: exact`, łamanie stron `.page-break-before`. |
| `tests/unit/assets-integrity.test.js` | Fizyczna obecność zasobów statycznych (zdjęcie, favicon SVG, podgląd og-preview, CSS, JS). |
| `tests/unit/pdf-generator.test.js` | Wykrywanie silnika Chromium (Edge/Chrome) oraz kompilacja pliku PDF. |
| `tests/unit/repo-hygiene.test.js` | Higiena repozytorium wzorowana na Gal Anonim (hook pre-commit, dependabot, sitemap, brak konfliktów git). |

---

## 💻 Komendy Deweloperskie

```bash
# Uruchomienie wszystkich testów jednostkowych
npm test

# Wyświetlenie pełnego raportu pokrycia kodu (Code Coverage)
npm run test:coverage

# Kompilacja oficjalnego pliku PDF z zachowaniem układu A4
npm run build:pdf

# Pełna weryfikacja składni i testów (Quality Gate)
npm run check

# Konfiguracja git hooka pre-commit
npm run prepare
```

---

## 🔒 Bezpieczeństwo i Higiena Kodu

* **Git Pre-commit Hook**: Plik `.githooks/pre-commit` blokuje lokalnie commity, jeśli `npm run check` zwróci błąd.
* **Dependabot**: Plik `.github/dependabot.yml` automatycznie monitoruje wersje akcji CI/CD i zależności pod kątem luk bezpieczeństwa.

---

© 2026 Krzysztof Początek. All rights reserved.
Strona domowa: [krzysztofpoczatek.pl](https://krzysztofpoczatek.pl)
