/**
 * Theme Manager for Cygnos
 * Handles theme switching and responsive design features
 */

class ThemeManager {
  constructor() {
    this.initElements();
    this.setupEventListeners();
    this.applyInitialTheme();
  }

  /**
   * Initialize elements
   */
  initElements() {
    this.themeToggleBtn = document.getElementById('theme-toggle-btn');
    this.htmlElement = document.documentElement;
    this.autoDetectTheme = document.getElementById('auto-dark-mode');
    this.toggleSidebarBtn = document.getElementById('toggle-sidebar');
    this.sidebar = document.querySelector('.sidebar');
    this.mainContent = document.querySelector('.main-content');
    this.progressBarContainer = document.getElementById('progress-bar-container');
    this.progressBar = document.getElementById('progress-bar');
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Theme toggle button
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Auto detect theme checkbox
    if (this.autoDetectTheme) {
      this.autoDetectTheme.addEventListener('change', () => this.handleAutoDetectChange());
    }

    // System theme change detection
    this.prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
    this.prefersDarkMode.addEventListener('change', (e) => this.handleSystemThemeChange(e));

    // Mobile sidebar toggle
    if (this.toggleSidebarBtn) {
      this.toggleSidebarBtn.addEventListener('click', () => this.toggleSidebar());
    }

    // Handle window resize for responsive design
    window.addEventListener('resize', () => this.handleWindowResize());
  }

  /**
   * Apply initial theme based on saved settings
   */
  applyInitialTheme() {
    const savedTheme = localStorage.getItem('theme');
    const savedAutoDetect = localStorage.getItem('autoDetectTheme');

    if (savedAutoDetect === 'true' && this.autoDetectTheme) {
      this.autoDetectTheme.checked = true;
      const systemTheme = this.prefersDarkMode.matches ? 'dark' : 'light';
      this.setTheme(systemTheme);
    } else if (savedTheme) {
      this.setTheme(savedTheme);
      if (this.autoDetectTheme) this.autoDetectTheme.checked = false;
    } else {
      // Default to light theme if no saved preference
      this.setTheme('light');
    }
  }

  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    const currentTheme = this.htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    this.setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    localStorage.setItem('autoDetectTheme', 'false');
    
    if (this.autoDetectTheme) this.autoDetectTheme.checked = false;
  }

  /**
   * Set theme to either light or dark
   * @param {string} theme - 'light' or 'dark'
   */
  setTheme(theme) {
    this.htmlElement.setAttribute('data-theme', theme);
    this.updateThemeIcon(theme);
  }

  /**
   * Update theme toggle icon based on current theme
   * @param {string} theme - Current theme ('light' or 'dark')
   */
  updateThemeIcon(theme) {
    if (!this.themeToggleBtn) return;
    
    if (theme === 'dark') {
      this.themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i><span class="tooltip-text">ライトモードに切替</span>';
    } else {
      this.themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i><span class="tooltip-text">ダークモードに切替</span>';
    }
  }

  /**
   * Handle auto detect theme checkbox change
   */
  handleAutoDetectChange() {
    if (!this.autoDetectTheme) return;
    
    if (this.autoDetectTheme.checked) {
      const systemTheme = this.prefersDarkMode.matches ? 'dark' : 'light';
      this.setTheme(systemTheme);
      localStorage.setItem('autoDetectTheme', 'true');
    } else {
      localStorage.setItem('autoDetectTheme', 'false');
      // Keep current theme when disabling auto-detect
    }
  }

  /**
   * Handle system theme change
   * @param {MediaQueryListEvent} event - Media query change event
   */
  handleSystemThemeChange(event) {
    if (this.autoDetectTheme && this.autoDetectTheme.checked) {
      const newTheme = event.matches ? 'dark' : 'light';
      this.setTheme(newTheme);
    }
  }

  /**
   * Toggle sidebar for mobile view
   */
  toggleSidebar() {
    if (!this.sidebar || !this.mainContent) return;
    
    this.sidebar.classList.toggle('active');
    this.mainContent.classList.toggle('sidebar-active');
  }

  /**
   * Handle window resize for responsive design
   */
  handleWindowResize() {
    if (window.innerWidth > 768 && this.sidebar && this.sidebar.classList.contains('active')) {
      this.sidebar.classList.remove('active');
      if (this.mainContent) this.mainContent.classList.remove('sidebar-active');
    }
  }

  /**
   * Show loading progress bar
   * @param {boolean} show - Whether to show or hide the progress bar
   */
  showProgress(show = true) {
    if (!this.progressBarContainer || !this.progressBar) return;
    
    if (show) {
      this.progressBarContainer.style.display = 'block';
      this.progressBar.style.width = '0%';
      
      // Animation effect
      setTimeout(() => {
        this.progressBar.style.width = '90%';
      }, 10);
    } else {
      this.progressBar.style.width = '100%';
      
      setTimeout(() => {
        this.progressBarContainer.style.display = 'none';
      }, 500);
    }
  }

  /**
   * Update progress bar percentage
   * @param {number} percent - Progress percentage (0-100)
   */
  updateProgress(percent) {
    if (!this.progressBar) return;
    this.progressBar.style.width = `${Math.min(90, percent)}%`;
  }
}

// Initialize the theme manager when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.themeManager = new ThemeManager();
});
