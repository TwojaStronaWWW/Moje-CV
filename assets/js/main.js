// Toggle sidebar na mobile
const toggleBtn = document.getElementById('toggleBtn')
const sidebar = document.getElementById('sidebar')

if (toggleBtn && sidebar) {
	toggleBtn.addEventListener('click', () => {
		const isExpanded = sidebar.classList.toggle('active')
		toggleBtn.setAttribute('aria-expanded', isExpanded)
		toggleBtn.textContent = isExpanded ? 'Ukryj menu' : 'Menu'
	})

	// Zamknij menu po kliknięciu poza nim
	document.addEventListener('click', e => {
		if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
			sidebar.classList.remove('active')
			toggleBtn.setAttribute('aria-expanded', 'false')
			toggleBtn.textContent = 'Menu'
		}
	})
}

// Przycisk drukowania
const printBtn = document.getElementById('printBtn')

if (printBtn) {
	printBtn.addEventListener('click', () => {
		window.print()
	})
}
