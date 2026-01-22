// Toggle sidebar na mobile
const toggleBtn = document.getElementById('toggleBtn');
const sidebar = document.getElementById('sidebar');

if (toggleBtn) {
  toggleBtn.addEventListener('click', function() {
    sidebar.classList.toggle('active');
    
    if (sidebar.classList.contains('active')) {
      toggleBtn.textContent = 'Ukryj menu';
    } else {
      toggleBtn.textContent = 'Menu';
    }
  });
}

// Przycisk drukowania
const printBtn = document.getElementById('printBtn');

if (printBtn) {
  printBtn.addEventListener('click', function() {
    window.print();
  });
}
