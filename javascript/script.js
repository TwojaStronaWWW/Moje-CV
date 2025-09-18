function toggleSidebar() {
  const sidebar = document.querySelector(".left-side");
  const toggleBtn = document.querySelector(".toggle-button");

  if (sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
    toggleBtn.textContent = "Pokaż menu";
  } else {
    sidebar.classList.add("active");
    toggleBtn.textContent = "Ukryj menu";
  }
}
