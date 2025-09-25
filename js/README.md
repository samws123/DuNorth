# DuNorth JavaScript Architecture

This document describes the refactored JavaScript architecture for the DuNorth application, implementing modern best practices and modular design.

## 📁 File Structure

```
js/
├── utils/                # Utility functions organized by category
│   ├── index.js         # Central export hub for all utilities
│   ├── constants.js     # Application constants and configuration
│   ├── dom.js           # DOM manipulation utilities
│   ├── validation.js    # Form and data validation functions
│   ├── api.js           # API request and authentication utilities
│   ├── storage.js       # localStorage management functions
│   ├── error-handling.js # Error handling and logging utilities
│   └── helpers.js       # General helper functions
├── extension-bridge.js   # Extension communication layer
├── canvas-sync.js        # Canvas data synchronization
├── chat.js              # Chat interface and Canvas sync UI
├── main.js              # Main page registration and authentication
└── README.md            # This documentation
```

## 🏗️ Architecture Overview

### Modular Design
- **ES6 Modules**: All files use modern ES6 import/export syntax
- **Separation of Concerns**: Each module has a specific responsibility
- **Reusable Components**: Common functionality is centralized in utilities

### Key Principles Applied
- **DRY (Don't Repeat Yourself)**: Common code extracted to utilities
- **Single Responsibility**: Each function has one clear purpose
- **Error Handling**: Consistent error handling throughout
- **Documentation**: JSDoc comments for all public functions
- **Type Safety**: Parameter validation and type checking

## 📚 Module Documentation

### `utils/` - Organized Utility Functions
Utility functions organized by category for better maintainability.

#### `utils/constants.js` - Configuration
**Key Features:**
- Application configuration constants
- API endpoints and timeouts
- File extensions and storage keys

#### `utils/dom.js` - DOM Manipulation
**Key Features:**
- Safe element selection with error handling
- Form input value extraction
- Error message management
- Message appending with auto-scroll

#### `utils/validation.js` - Data Validation
**Key Features:**
- Email format validation
- Password strength validation
- Required field validation
- String length validation
- URL format validation

#### `utils/api.js` - API Communication
**Key Features:**
- Authenticated API requests
- Token management
- Base URL resolution

#### `utils/storage.js` - Local Storage
**Key Features:**
- User ID and token management
- JSON serialization/deserialization
- Storage cleanup utilities

#### `utils/error-handling.js` - Error Management
**Key Features:**
- Centralized error handling
- Context-aware error messages
- Retry mechanisms
- Structured error logging

#### `utils/helpers.js` - General Utilities
**Key Features:**
- Sleep and timing functions
- File type detection
- Date formatting
- Debounce and throttle
- Object manipulation utilities

#### `utils/index.js` - Central Export Hub
Re-exports all utility functions for easy importing:
```javascript
import { 
  CONFIG,
  getElementById,
  isValidEmail,
  apiRequest,
  getUserId,
  handleError,
  sleep
} from './utils/index.js';
```

### `extension-bridge.js` - Extension Communication
Handles all communication with the DuNorth browser extension.

**Key Features:**
- Bridge communication protocol
- Chrome extension direct messaging
- Unified extension communication with fallbacks
- Connection testing and verification
- Canvas data synchronization

**Main Exports:**
```javascript
bridgeCall(type, payload, timeoutMs)
chromeExtensionCall(type, payload, timeoutMs)
extensionCall(type, payload, timeoutMs)
testExtensionConnection()
getExtensionFingerprint()
syncCanvasData(userToken, baseUrl)
```

### `canvas-sync.js` - Canvas Integration
Manages all Canvas LMS data import and synchronization operations.

**Key Features:**
- Course, assignment, grade, and announcement imports
- Server-side and client-side text extraction
- Comprehensive sync operations
- Progress tracking and status updates
- Error handling for sync failures

**Main Exports:**
```javascript
// Import Operations
importCourses(token)
importAssignments(token, includeGrades)
importGrades(token)
importAnnouncements(token)

// Sync Operations
syncCourse(token, courseId)
getCourses(userId)

// Text Extraction
extractCourseTexts(token, courseId, limit, force)
clientExtractTexts(courseId, statusCallback)

// Comprehensive Operations
performFullSync(userId, token, statusCallback)
```

### `chat.js` - Chat Interface
Main chat interface with Canvas synchronization capabilities.

**Key Features:**
- Clean, modular chat message handling
- Canvas refresh functionality using imported modules
- Upgrade modal management
- Proper error handling and user feedback
- Legacy function compatibility

**Key Functions:**
```javascript
handleSendMessage()
sendChatMessage(message)
displayMessage(role, text)
handleCanvasRefresh()
initializeUpgradeModal()
```

### `main.js` - Registration & Authentication
Handles user registration and authentication on the main page.

**Key Features:**
- Form validation and submission
- Google OAuth integration
- Upgrade modal functionality
- Proper error handling and user feedback
- Clean initialization pattern

**Key Functions:**
```javascript
handleFormSubmit(event)
validateFormData()
registerUser(userData)
handleGoogleSignIn()
initializeUpgradeModal()
```

## 🔧 Configuration

### Constants (`CONFIG` object in `utils.js`)
```javascript
CONFIG = {
  EXTENSION_ID: 'elipinieeokobcniibdafjkbifbfencb',
  DEFAULT_BASE_URL: 'https://princeton.instructure.com',
  API_ENDPOINT: 'https://du-north-three.vercel.app/api',
  TIMEOUTS: {
    BRIDGE_DEFAULT: 8000,
    EXTENSION_PING: 4000,
    FINGERPRINT: 6000,
    SYNC_CANVAS: 8000,
    EXTRACTION_POLL: 200000
  },
  TEXT_FILE_EXTENSIONS: ['.pdf', '.docx', '.pptx', ...],
  STORAGE_KEYS: {
    USER_ID: 'dunorth_user',
    TOKEN: 'dunorth_token'
  }
}
```

## 🚀 Usage

### HTML Integration
Update HTML files to use ES6 modules:
```html
<script type="module" src="js/main.js"></script>
<script type="module" src="js/chat.js"></script>
```

### Import Patterns
```javascript
// Import specific utilities
import { getElementById, isValidEmail } from './utils/index.js';

// Import from specific utility files
import { CONFIG } from './utils/constants.js';
import { handleError } from './utils/error-handling.js';
```

### Error Handling Pattern
```javascript
import { createErrorHandler, handleError } from './utils/index.js';

// Create context-specific error handler
const errorHandler = createErrorHandler('Operation failed', displayMessage);

try {
  // Your code here
} catch (error) {
  errorHandler(error);
}
```

### API Request Pattern
```javascript
import { apiRequest, getUserToken } from './utils/index.js';

const token = await getUserToken(userId);
const response = await apiRequest('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data)
}, token);
```

## 🔍 Best Practices Implemented

### Code Organization
- ✅ Modular architecture with clear separation of concerns
- ✅ Consistent naming conventions
- ✅ Proper file structure and organization
- ✅ ES6 modules for better dependency management

### Error Handling
- ✅ Centralized error handling utilities
- ✅ Context-aware error messages
- ✅ Graceful degradation on failures
- ✅ User-friendly error feedback

### Performance
- ✅ Lazy loading of modules
- ✅ Efficient DOM manipulation
- ✅ Proper event listener management
- ✅ Memory leak prevention

### Maintainability
- ✅ Comprehensive JSDoc documentation
- ✅ Clear function signatures and return types
- ✅ Consistent code style
- ✅ Easy to extend and modify

### Security
- ✅ Input validation and sanitization
- ✅ Secure token handling
- ✅ XSS prevention measures
- ✅ Safe DOM manipulation

## 🔄 Migration Notes

### Breaking Changes
- All JavaScript files now use ES6 modules
- HTML files must include `type="module"` in script tags
- Some function names have been updated for consistency

### Backward Compatibility
- Legacy functions (`addMsg`, `banner`) are maintained for compatibility
- Existing API contracts are preserved
- Configuration values are centralized but maintain same behavior

## 🧪 Testing Considerations

### Unit Testing
- Each module can be tested independently
- Pure functions are easily testable
- Mock-friendly architecture with dependency injection

### Integration Testing
- Clear module boundaries make integration testing straightforward
- Error handling can be tested systematically
- API interactions are well-defined

## 📈 Future Improvements

### Potential Enhancements
- TypeScript migration for better type safety
- Service worker integration for offline functionality
- More granular error recovery mechanisms
- Performance monitoring and analytics
- Automated testing suite

### Scalability
- Easy to add new modules
- Clear patterns for extending functionality
- Maintainable codebase for team development
- Documentation-driven development approach
