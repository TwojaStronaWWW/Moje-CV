const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..', '..');

describe('Higiena repozytorium (Repo Hygiene wzorowane na Gal Anonim)', () => {
  it('plik package.json powinien posiadać wymagane skrypty CI (test, check, check:syntax)', () => {
    const pkgPath = path.join(ROOT_DIR, 'package.json');
    assert.ok(fs.existsSync(pkgPath), 'Brak package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

    assert.ok(pkg.scripts, 'Brak sekcji scripts w package.json');
    assert.ok(pkg.scripts.test, 'Brak skryptu test');
    assert.ok(pkg.scripts['check:syntax'], 'Brak skryptu check:syntax');
    assert.ok(pkg.scripts.check, 'Brak skryptu check');
  });

  it('konfiguracja CI/CD (.github/workflows/deploy.yml) powinna istnieć i posiadać zdefiniowane etapy', () => {
    const workflowPath = path.join(ROOT_DIR, '.github', 'workflows', 'deploy.yml');
    assert.ok(fs.existsSync(workflowPath), 'Brak pliku .github/workflows/deploy.yml');
    const content = fs.readFileSync(workflowPath, 'utf-8');

    assert.match(content, /runs-on:\s*ubuntu-latest/i);
    assert.match(content, /actions\/checkout@v4/i);
  });

  it('kluczowe pliki źródłowe nie mogą zawierać pozostałości po konfliktach gita (merge conflict markers)', () => {
    const extensionsToCheck = ['.html', '.js', '.css', '.json', '.yml', '.md'];

    const CONFLICT_START = '<<<<<<<' + ' ';
    const CONFLICT_END = '>>>>>>>' + ' ';

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.git') || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (fullPath === __filename) continue;
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (extensionsToCheck.some(ext => entry.name.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          assert.strictEqual(
            content.includes(CONFLICT_START) || content.includes(CONFLICT_END),
            false,
            `Wykryto marker konfliktu git w pliku: ${path.relative(ROOT_DIR, fullPath)}`
          );
        }
      }
    }

    scanDir(ROOT_DIR);
  });

  it('pliki instrukcji AGENTS.md oraz GEMINI.md powinny istnieć w katalogu głównym projektu', () => {
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'AGENTS.md')), 'Brak AGENTS.md');
    assert.ok(fs.existsSync(path.join(ROOT_DIR, 'GEMINI.md')), 'Brak GEMINI.md');
  });

  it('git hook (.githooks/pre-commit) powinien istnieć, posiadać shebang bash i uruchamiać npm run check', () => {
    const hookPath = path.join(ROOT_DIR, '.githooks', 'pre-commit');
    assert.ok(fs.existsSync(hookPath), 'Brak .githooks/pre-commit');
    const content = fs.readFileSync(hookPath, 'utf-8');
    const firstLine = content.split(/\r?\n/)[0];

    assert.match(firstLine, /^#!\/(usr\/bin\/env bash|bin\/bash)\s*$/, 'Hook pre-commit nie posiada poprawnego shebangu bash');
    assert.ok(content.includes('npm run check'), 'Hook pre-commit nie wywołuje komendy npm run check');
  });

  it('skrypt generowania PDF (scripts/generate-pdf.js) powinien istnieć i eksportować funkcje pomocnicze', () => {
    const scriptPath = path.join(ROOT_DIR, 'scripts', 'generate-pdf.js');
    assert.ok(fs.existsSync(scriptPath), 'Brak scripts/generate-pdf.js');

    const pdfModule = require('../../scripts/generate-pdf');
    assert.strictEqual(typeof pdfModule.generatePdf, 'function');
    assert.strictEqual(typeof pdfModule.findBrowserBinary, 'function');
  });

  it('konfiguracja audytu Lighthouse CI (.lighthouserc.json) powinna istnieć i definiować asercje jakościowe', () => {
    const lhciPath = path.join(ROOT_DIR, '.lighthouserc.json');
    assert.ok(fs.existsSync(lhciPath), 'Brak .lighthouserc.json');

    const config = JSON.parse(fs.readFileSync(lhciPath, 'utf-8'));
    assert.ok(config.ci, 'Brak klucza ci');
    assert.ok(config.ci.assert && config.ci.assert.assertions, 'Brak definicji asercji w lighthouserc.json');
    assert.ok(config.ci.assert.assertions['categories:accessibility']);
    assert.ok(config.ci.assert.assertions['categories:seo']);
  });

  it('pliki robots.txt i sitemap.xml powinny istnieć i definiować poprawne reguły indeksowania', () => {
    const robotsPath = path.join(ROOT_DIR, 'robots.txt');
    assert.ok(fs.existsSync(robotsPath), 'Brak robots.txt');
    const robotsContent = fs.readFileSync(robotsPath, 'utf-8');
    assert.match(robotsContent, /User-agent:\s*\*/i);
    assert.match(robotsContent, /Sitemap:\s*https:\/\/krzysztofpoczatek\.pl\/sitemap\.xml/i);

    const sitemapPath = path.join(ROOT_DIR, 'sitemap.xml');
    assert.ok(fs.existsSync(sitemapPath), 'Brak sitemap.xml');
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    assert.match(sitemapContent, /<loc>https:\/\/krzysztofpoczatek\.pl\/<\/loc>/i);
    assert.match(sitemapContent, /<loc>https:\/\/krzysztofpoczatek\.pl\/Krzysztof_Poczatek_CV\.pdf<\/loc>/i);
  });

  it('konfiguracja Dependabot (.github/dependabot.yml) powinna istnieć i chronić zależności przed CVE', () => {
    const dependabotPath = path.join(ROOT_DIR, '.github', 'dependabot.yml');
    assert.ok(fs.existsSync(dependabotPath), 'Brak .github/dependabot.yml');
    const content = fs.readFileSync(dependabotPath, 'utf-8');
    assert.match(content, /package-ecosystem:\s*"github-actions"/i);
    assert.match(content, /package-ecosystem:\s*"npm"/i);
  });

  it('plik README.md powinien istnieć, posiadać odznaki statusu i opis techniczny portfolio', () => {
    const readmePath = path.join(ROOT_DIR, 'README.md');
    assert.ok(fs.existsSync(readmePath), 'Brak README.md');
    const content = fs.readFileSync(readmePath, 'utf-8');
    assert.match(content, /# Krzysztof Początek/i);
    assert.match(content, /CI%2FCD%20Pipeline/i);
    assert.match(content, /Unit%20Tests/i);
  });
});
