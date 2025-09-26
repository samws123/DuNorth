/**
 * Email Verification Page JavaScript
 * Handles 6-digit code input, validation, and email client integration
 */

class EmailVerification {
  constructor() {
    this.codeInputs = document.querySelectorAll('.code-input');
    this.continueBtn = document.getElementById('continue-btn');
    this.gmailBtn = document.getElementById('open-gmail');
    this.outlookBtn = document.getElementById('open-outlook');
    this.userEmailSpan = document.getElementById('user-email');
    
    this.code = ['', '', '', '', '', ''];
    this.userEmail = '';
    
    this.init();
  }

  init() {
    this.loadUserEmail();
    this.setupEventListeners();
    this.focusFirstInput();
    this.initializeButtonState();
  }

  initializeButtonState() {
    // Ensure continue button is always enabled
    if (this.continueBtn) {
      this.continueBtn.disabled = false;
    }
  }

  loadUserEmail() {
    // Get email from session storage (set by signup page)
    const storedEmail = sessionStorage.getItem('signup_email');
    if (storedEmail) {
      this.userEmail = storedEmail;
      if (this.userEmailSpan) {
        this.userEmailSpan.textContent = storedEmail;
      }
    } else {
      // Fallback email for demo
      this.userEmail = 'your email';
      if (this.userEmailSpan) {
        this.userEmailSpan.textContent = 'your email';
      }
    }
  }

  setupEventListeners() {
    // Code input event listeners
    this.codeInputs.forEach((input, index) => {
      input.addEventListener('input', (e) => {
        this.handleCodeInput(index, e.target.value);
      });

      input.addEventListener('keydown', (e) => {
        this.handleKeyDown(index, e);
      });

      input.addEventListener('paste', (e) => {
        this.handlePaste(e);
      });

      input.addEventListener('focus', () => {
        this.clearErrors();
      });
    });

    // Continue button
    if (this.continueBtn) {
      this.continueBtn.addEventListener('click', () => {
        this.handleContinue();
      });
    }

    // Email client buttons
    if (this.gmailBtn) {
      this.gmailBtn.addEventListener('click', () => {
        this.openEmailClient('gmail');
      });
    }

    if (this.outlookBtn) {
      this.outlookBtn.addEventListener('click', () => {
        this.openEmailClient('outlook');
      });
    }
  }

  focusFirstInput() {
    if (this.codeInputs[0]) {
      this.codeInputs[0].focus();
    }
  }

  handleCodeInput(index, value) {
    // Only allow numeric input
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue.length <= 1) {
      this.code[index] = numericValue;
      this.codeInputs[index].value = numericValue;
      
      // Update visual state
      this.updateInputState(index);
      
      // Auto-focus next input
      if (numericValue && index < 5) {
        this.codeInputs[index + 1].focus();
      }
      
      // Check if code is complete
      this.checkCodeComplete();
    }
  }

  handleKeyDown(index, event) {
    if (event.key === 'Backspace') {
      if (!this.code[index] && index > 0) {
        // Move to previous input if current is empty
        this.codeInputs[index - 1].focus();
      } else {
        // Clear current input
        this.code[index] = '';
        this.codeInputs[index].value = '';
        this.updateInputState(index);
        this.checkCodeComplete();
      }
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.codeInputs[index - 1].focus();
    } else if (event.key === 'ArrowRight' && index < 5) {
      this.codeInputs[index + 1].focus();
    } else if (event.key === 'Enter') {
      this.handleContinue();
    }
  }

  handlePaste(event) {
    event.preventDefault();
    const pastedData = event.clipboardData.getData('text');
    const numericData = pastedData.replace(/[^0-9]/g, '');
    
    if (numericData.length === 6) {
      // Fill all inputs with pasted code
      for (let i = 0; i < 6; i++) {
        this.code[i] = numericData[i];
        this.codeInputs[i].value = numericData[i];
        this.updateInputState(i);
      }
      
      // Focus last input
      this.codeInputs[5].focus();
      this.checkCodeComplete();
    }
  }

  updateInputState(index) {
    const input = this.codeInputs[index];
    
    if (this.code[index]) {
      input.classList.add('filled');
      input.classList.remove('error');
    } else {
      input.classList.remove('filled', 'error');
    }
  }

  checkCodeComplete() {
    const isComplete = this.code.every(digit => digit !== '');
    
    // Keep button always enabled - validation happens on click
    if (this.continueBtn) {
      this.continueBtn.disabled = false;
    }
    
    return isComplete;
  }

  async handleContinue() {
    // Clear any existing messages
    this.clearMessages();
    
    // Check if any inputs are empty
    const emptyInputs = this.code.filter(digit => digit === '').length;
    
    if (emptyInputs === 6) {
      this.showError('Please enter the verification code');
      this.focusFirstInput();
      return;
    }
    
    if (emptyInputs > 0) {
      this.showError('Please enter the complete 6-digit code');
      // Focus first empty input
      const firstEmptyIndex = this.code.findIndex(digit => digit === '');
      if (firstEmptyIndex !== -1) {
        this.codeInputs[firstEmptyIndex].focus();
      }
      this.highlightErrorInputs();
      return;
    }

    const fullCode = this.code.join('');
    
    // Set loading state
    this.setLoadingState(true);
    
    try {
      // Verify the code with backend
      const isValid = await this.verifyCode(fullCode);
      
      if (isValid) {
        this.showSuccess('Code verified successfully!');
        
        // Redirect after short delay
        setTimeout(() => {
          this.redirectToNextStep();
        }, 1500);
      } else {
        this.showError('Invalid code. Please check your email and try again.');
        this.highlightErrorInputs();
      }
    } catch (error) {
      console.error('Verification error:', error);
      this.showError('Something went wrong. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async verifyCode(code) {
    // Simulate API call - replace with actual verification endpoint
    return new Promise((resolve) => {
      setTimeout(() => {
        // For demo purposes, accept any 6-digit code
        // In production, this would call your verification API
        resolve(code.length === 6);
      }, 1500);
    });
  }

  highlightErrorInputs() {
    this.codeInputs.forEach((input, index) => {
      input.classList.add('error');
      setTimeout(() => {
        input.classList.remove('error');
      }, 2000);
    });
  }

  setLoadingState(loading) {
    if (!this.continueBtn) return;

    if (loading) {
      this.continueBtn.setAttribute('aria-busy', 'true');
      this.continueBtn.disabled = true;
      this.continueBtn.innerHTML = '<span>Verifying...</span>';
    } else {
      this.continueBtn.removeAttribute('aria-busy');
      this.continueBtn.disabled = false; // Always keep enabled
      this.continueBtn.innerHTML = '<span>Continue</span>';
    }
  }

  openEmailClient(provider) {
    const email = this.userEmail;
    
    if (provider === 'gmail') {
      // Open Gmail
      window.open('https://mail.google.com/', '_blank');
    } else if (provider === 'outlook') {
      // Open Outlook
      window.open('https://outlook.live.com/', '_blank');
    }
    
    // Show helpful message
    this.showMessage(`Opening ${provider === 'gmail' ? 'Gmail' : 'Outlook'}...`);
  }

  redirectToNextStep() {
    // Store verification success
    sessionStorage.setItem('email_verified', 'true');
    
    // Redirect to next step (replace with actual next page)
    console.log('Redirecting to next step...');
    // window.location.href = '/user-purpose';
    
    // For demo
    this.showMessage('Redirecting to next step...');
  }

  clearMessages() {
    const errorDiv = document.querySelector('.verification-error');
    const successDiv = document.querySelector('.verification-success');
    const messageDiv = document.querySelector('.verification-message');
    
    if (errorDiv) errorDiv.remove();
    if (successDiv) successDiv.remove();
    if (messageDiv) messageDiv.remove();
  }

  showError(message) {
    this.clearMessages();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'verification-error';
    errorDiv.textContent = message;
    
    // Insert after continue section
    const continueSection = document.querySelector('.continue-section');
    if (continueSection) {
      continueSection.appendChild(errorDiv);
    }
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  showSuccess(message) {
    this.clearMessages();
    
    const successDiv = document.createElement('div');
    successDiv.className = 'verification-success';
    successDiv.textContent = message;
    
    // Insert after continue section
    const continueSection = document.querySelector('.continue-section');
    if (continueSection) {
      continueSection.appendChild(successDiv);
    }
  }

  showMessage(message) {
    this.clearMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'verification-message';
    messageDiv.style.cssText = `
      color: #007bff;
      font-size: 14px;
      text-align: center;
      margin: 12px 0;
      padding: 12px;
      background: #f0f8ff;
      border: 1px solid #b3d9ff;
      border-radius: 12px;
      animation: slideIn 0.3s ease;
    `;
    messageDiv.textContent = message;
    
    // Insert after continue section
    const continueSection = document.querySelector('.continue-section');
    if (continueSection) {
      continueSection.appendChild(messageDiv);
    }
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.remove();
      }
    }, 3000);
  }
}

// Initialize the email verification page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new EmailVerification();
});

// Handle page visibility for better UX
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    // Focus first empty input when page becomes visible
    const verification = new EmailVerification();
    const firstEmptyIndex = verification.code.findIndex(digit => digit === '');
    if (firstEmptyIndex !== -1 && verification.codeInputs[firstEmptyIndex]) {
      verification.codeInputs[firstEmptyIndex].focus();
    }
  }
});
