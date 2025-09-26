/**
 * Signup Page JavaScript
 * Handles form interactions and navigation for the modern signup page
 */

class SignupPage {
  constructor() {
    this.emailInput = document.getElementById('email-input');
    this.continueBtn = document.getElementById('continue-email-btn');
    this.googleBtn = document.getElementById('google-signin');
    this.microsoftBtn = document.getElementById('microsoft-signin');
    this.appleBtn = document.getElementById('apple-signin');
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupFormValidation();
  }

  setupEventListeners() {
    // Email form submission
    if (this.continueBtn) {
      this.continueBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.handleEmailContinue();
      });
    }

    // Enter key on email input
    if (this.emailInput) {
      this.emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleEmailContinue();
        }
      });

      // Real-time validation
      this.emailInput.addEventListener('input', () => {
        this.validateEmailInput();
      });
    }

    // Social login buttons
    if (this.googleBtn) {
      this.googleBtn.addEventListener('click', () => {
        this.handleSocialLogin('google');
      });
    }

    if (this.microsoftBtn) {
      this.microsoftBtn.addEventListener('click', () => {
        this.handleSocialLogin('microsoft');
      });
    }

    if (this.appleBtn) {
      this.appleBtn.addEventListener('click', () => {
        this.handleSocialLogin('apple');
      });
    }
  }

  setupFormValidation() {
    // Keep button always enabled, validate on click
    if (this.continueBtn) {
      this.continueBtn.disabled = false;
    }
  }

  validateEmailInput() {
    if (!this.emailInput) return;

    const email = this.emailInput.value.trim();
    const isValid = this.isValidEmail(email);
    
    // Update input styling based on content
    if (email.length > 0) {
      if (isValid) {
        this.emailInput.style.borderColor = '#007bff';
        this.emailInput.style.boxShadow = '0 0 0 1px #007bff';
      } else {
        this.emailInput.style.borderColor = '#dc3545';
        this.emailInput.style.boxShadow = '0 0 0 1px #dc3545';
      }
    } else {
      this.emailInput.style.borderColor = '#e5e5e5';
      this.emailInput.style.boxShadow = 'none';
    }
    
    return isValid;
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async handleEmailContinue() {
    if (!this.emailInput || !this.continueBtn) return;

    const email = this.emailInput.value.trim();
    
    // Clear any existing error messages
    this.clearMessages();
    
    // Validate email input
    if (!email) {
      this.showError('Please enter your email address');
      this.emailInput.focus();
      return;
    }
    
    if (!this.isValidEmail(email)) {
      this.showError('Please enter a valid email address');
      this.emailInput.focus();
      // Update input styling to show error
      this.emailInput.style.borderColor = '#dc3545';
      this.emailInput.style.boxShadow = '0 0 0 2px rgba(220, 53, 69, 0.25)';
      this.emailInput.classList.add('error');
      
      // Remove error class after animation
      setTimeout(() => {
        this.emailInput.classList.remove('error');
      }, 500);
      
      return;
    }

    // Set loading state
    this.setLoadingState(true);

    try {
      // Check if user exists or needs to register
      const response = await this.checkUserExists(email);
      
      if (response.exists) {
        // Redirect to login/password page
        this.redirectToLogin(email);
      } else {
        // Redirect to registration page
        this.redirectToRegister(email);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      this.showError('Something went wrong. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async checkUserExists(email) {
    // Simulate API call - replace with actual endpoint
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo purposes, assume user doesn't exist
        resolve({ exists: false });
      }, 1000);
    });
  }

  handleSocialLogin(provider) {
    console.log(`Initiating ${provider} login...`);
    
    // Set loading state for the clicked button
    const button = document.getElementById(`${provider}-signin`);
    if (button) {
      button.style.opacity = '0.7';
      button.style.cursor = 'not-allowed';
      button.disabled = true;
    }

    if (provider === 'google') {
      this.redirectToGoogleAuth();
    } else if (provider === 'microsoft') {
      this.redirectToMicrosoftAuth();
    } else if (provider === 'apple') {
      this.redirectToAppleAuth();
    }
  }

  redirectToGoogleAuth() {
    try {
      // Use the same Google OAuth flow as index.html
      const callbackUrl = encodeURIComponent('/schools/school.html');
      const url = `/api/auth/google-start?callbackUrl=${callbackUrl}`;
      
      console.log('Redirecting to Google OAuth:', url);
      window.location.href = url;
    } catch (error) {
      console.error('Google auth error:', error);
      this.showError('Failed to start Google sign-in. Please try again.');
      
      // Reset button state
      const button = document.getElementById('google-signin');
      if (button) {
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.disabled = false;
      }
    }
  }

  redirectToMicrosoftAuth() {
    // Replace with actual Microsoft OAuth URL when available
    console.log('Redirecting to Microsoft OAuth...');
    this.showMessage('Microsoft sign-in coming soon');
    this.resetButtonState('microsoft-signin');
  }

  redirectToAppleAuth() {
    // Replace with actual Apple OAuth URL when available
    console.log('Redirecting to Apple OAuth...');
    this.showMessage('Apple sign-in coming soon');
    this.resetButtonState('apple-signin');
  }

  resetButtonState(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
      button.disabled = false;
    }
  }

  redirectToLogin(email) {
    // Store email for next page
    sessionStorage.setItem('signup_email', email);
    
    // Redirect to email verification page
    console.log(`Redirecting to email verification for: ${email}`);
    window.location.href = '/email-verification.html';
  }

  redirectToRegister(email) {
    // Store email for next page
    sessionStorage.setItem('signup_email', email);
    
    // Redirect to email verification page
    console.log(`Redirecting to email verification for: ${email}`);
    window.location.href = '/email-verification.html';
  }

  setLoadingState(loading) {
    if (!this.continueBtn) return;

    if (loading) {
      this.continueBtn.setAttribute('aria-busy', 'true');
      this.continueBtn.disabled = true;
      this.continueBtn.innerHTML = '<span>Please wait...</span>';
    } else {
      this.continueBtn.removeAttribute('aria-busy');
      this.continueBtn.disabled = false;
      this.continueBtn.innerHTML = '<span>Continue with email</span>';
    }
  }

  clearMessages() {
    // Clear error messages
    const errorDiv = document.querySelector('.signup-error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
    
    // Clear success messages
    const messageDiv = document.querySelector('.signup-message');
    if (messageDiv) {
      messageDiv.style.display = 'none';
    }
  }

  showError(message) {
    // Create or update error message
    let errorDiv = document.querySelector('.signup-error');
    
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'signup-error';
      errorDiv.style.cssText = `
        color: #dc3545;
        font-size: 14px;
        text-align: center;
        margin-top: 12px;
        padding: 12px;
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 12px;
        animation: slideIn 0.3s ease;
      `;
      
      // Insert after email form
      const emailForm = document.querySelector('.email-form');
      if (emailForm) {
        emailForm.appendChild(errorDiv);
      }
    }
    
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Hide after 5 seconds
    setTimeout(() => {
      if (errorDiv) {
        errorDiv.style.display = 'none';
      }
    }, 5000);
  }

  showMessage(message) {
    // Create or update success message
    let messageDiv = document.querySelector('.signup-message');
    
    if (!messageDiv) {
      messageDiv = document.createElement('div');
      messageDiv.className = 'signup-message';
      messageDiv.style.cssText = `
        color: #155724;
        font-size: 14px;
        text-align: center;
        margin-top: 12px;
        padding: 8px;
        background: #d4edda;
        border: 1px solid #c3e6cb;
        border-radius: 8px;
      `;
      
      // Insert after email form
      const emailForm = document.querySelector('.email-form');
      if (emailForm) {
        emailForm.appendChild(messageDiv);
      }
    }
    
    messageDiv.textContent = message;
    messageDiv.style.display = 'block';
    
    // Hide after 3 seconds
    setTimeout(() => {
      if (messageDiv) {
        messageDiv.style.display = 'none';
      }
    }, 3000);
  }
}

// Initialize the signup page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new SignupPage();
});

// Handle page visibility for better UX
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Reset any loading states when page becomes visible again
    const continueBtn = document.getElementById('continue-email-btn');
    if (continueBtn && continueBtn.hasAttribute('aria-busy')) {
      continueBtn.removeAttribute('aria-busy');
      continueBtn.disabled = false;
      continueBtn.innerHTML = '<span>Continue with email</span>';
    }
  }
});
