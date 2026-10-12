const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML_PATH = path.join(__dirname, '..', '..', 'index.html');

describe('Integralność semantyczna i SEO (index.html)', () => {
  const htmlContent = fs.readFileSync(HTML_PATH, 'utf-8');

  it('plik index.html powinien istnieć i mieć niepustą zawartość', () => {
    assert.ok(fs.existsSync(HTML_PATH));
    assert.ok(htmlContent.length > 500);
  });

  it('powinien posiadać poprawny DOCTYPE oraz deklarację języka polskiego <html lang="pl">', () => {
    assert.match(htmlContent, /<!DOCTYPE html>/i);
    assert.match(htmlContent, /<html\s+lang="pl">/i);
  });

  describe('Metadane w sekcji <head>', () => {
    it('powinien definiować unikalny i precyzyjny tytuł <title> z nazwiskiem i kluczową specjalizacją', () => {
      const match = htmlContent.match(/<title>(.*?)<\/title>/i);
      assert.ok(match, 'Brak znacznika <title>');
      const title = match[1];
      assert.ok(title.includes('Krzysztof Początek'));
      assert.ok(title.includes('Specjalista IT') || title.includes('Wdrożeniowiec'));
    });

    it('powinien posiadać opis <meta name="description"> o odpowiedniej długości i ze słowami kluczowymi', () => {
      const match = htmlContent.match(/<meta\s+name="description"\s+content="(.*?)"/is);
      assert.ok(match, 'Brak znacznika meta description');
      const desc = match[1];
      assert.ok(desc.length >= 50, `Opis jest zbyt krótki (${desc.length} znaków)`);
      assert.ok(desc.includes('AMMS') || desc.includes('KS-SOMED'));
      assert.ok(desc.includes('ISO'));
    });

    it('powinien posiadać link kanoniczny do domeny krzysztofpoczatek.pl', () => {
      assert.match(htmlContent, /<link\s+rel="canonical"\s+href="https:\/\/krzysztofpoczatek\.pl\/?">/i);
    });

    it('powinien zawierać kompletne tagi protokołu Open Graph (og:title, og:description, og:image, og:url)', () => {
      assert.match(htmlContent, /<meta\s+property="og:type"\s+content="website">/i);
      assert.match(htmlContent, /<meta\s+property="og:url"\s+content="https:\/\/krzysztofpoczatek\.pl\/?">/i);
      assert.match(htmlContent, /<meta\s+property="og:title"\s+content="[^"]+">/i);
      assert.match(htmlContent, /<meta\s+property="og:description"\s+content="[^"]+">/i);
      assert.match(htmlContent, /<meta\s+property="og:image"\s+content="[^"]+og-preview\.(png|jpg)[^"]*">/i);
      assert.match(htmlContent, /<meta\s+property="og:image:width"\s+content="1200">/i);
      assert.match(htmlContent, /<meta\s+property="og:image:height"\s+content="630">/i);
    });

    it('powinien zawierać kompletne tagi Twitter / X Card', () => {
      assert.match(htmlContent, /<meta\s+name="twitter:card"\s+content="summary_large_image">/i);
      assert.match(htmlContent, /<meta\s+name="twitter:title"\s+content="[^"]+">/i);
      assert.match(htmlContent, /<meta\s+name="twitter:description"\s+content="[^"]+">/i);
      assert.match(htmlContent, /<meta\s+name="twitter:image"\s+content="[^"]+">/i);
    });
  });

  describe('Strukturyzowane dane Schema.org (JSON-LD)', () => {
    it('powinien zawierać poprawny składniowo blok JSON-LD ze schematem Person', () => {
      const match = htmlContent.match(/<script\s+type="application\/ld\+json">(.*?)<\/script>/s);
      assert.ok(match, 'Brak bloku Schema.org JSON-LD w index.html');

      let schema;
      assert.doesNotThrow(() => {
        schema = JSON.parse(match[1]);
      }, 'Skrypt JSON-LD zawiera błąd składni JSON!');

      assert.strictEqual(schema['@context'], 'https://schema.org');
      assert.strictEqual(schema['@type'], 'Person');
      assert.strictEqual(schema.name, 'Krzysztof Początek');
      assert.ok(schema.jobTitle && schema.jobTitle.length > 5);
      assert.strictEqual(schema.url, 'https://krzysztofpoczatek.pl');
      assert.ok(Array.isArray(schema.knowsAbout), 'knowsAbout musi być tablicą');
      assert.ok(schema.knowsAbout.includes('ISO/IEC 27001'));
      assert.ok(schema.knowsAbout.includes('ITIL 4'));
      assert.ok(schema.knowsAbout.includes('AMMS'));
      assert.ok(schema.knowsAbout.includes('KS-SOMED'));
    });
  });

  describe('Dostępność (a11y) i semantyka HTML5', () => {
    it('powinien posiadać dokładnie jeden nagłówek poziomu pierwszego <h1> (nazwisko kandydata)', () => {
      const h1Matches = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/gi);
      assert.ok(h1Matches, 'Brak nagłówka <h1>');
      assert.strictEqual(h1Matches.length, 1, `Oczekiwano dokładnie jednego nagłówka <h1>, znaleziono: ${h1Matches.length}`);
      assert.match(h1Matches[0], /Krzysztof Początek/i);
    });

    it('wszystkie znaczniki <img> powinny posiadać atrybuty alt, width oraz height dla CLS/a11y', () => {
      const imgRegex = /<img\s+([^>]+)>/gi;
      let match;
      let count = 0;
      while ((match = imgRegex.exec(htmlContent)) !== null) {
        count++;
        const imgAttributes = match[1];
        assert.match(imgAttributes, /alt="[^"]*"/i, `Obraz ${match[0]} nie posiada atrybutu alt`);
        assert.match(imgAttributes, /width="[^"]*"/i, `Obraz ${match[0]} nie posiada atrybutu width`);
        assert.match(imgAttributes, /height="[^"]*"/i, `Obraz ${match[0]} nie posiada atrybutu height`);
      }
      assert.ok(count > 0, 'Powinien istnieć co najmniej jeden znacznik <img> (np. zdjęcie profilowe)');
    });

    it('przycisk mobilnego menu powinien posiadać atrybuty ARIA (aria-expanded, aria-controls)', () => {
      assert.match(htmlContent, /<button[^>]+id="toggleBtn"[^>]+aria-controls="sidebar"/i);
      assert.match(htmlContent, /<button[^>]+id="toggleBtn"[^>]+aria-expanded="false"/i);
    });

    it('panel boczny <aside id="sidebar"> powinien posiadać etykietę dostępności aria-label', () => {
      assert.match(htmlContent, /<aside\s+id="sidebar"[^>]+aria-label="[^"]+"/i);
    });
  });
});
