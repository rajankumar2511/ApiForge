Here's the README in proper Markdown (.md) format:

```markdown
# ⚡ APIForge

> Automatically generate frontend API code from backend routes — instantly.

[![VSCode](https://img.shields.io/badge/VSCode-Extension-blue?logo=visualstudiocode)](https://marketplace.visualstudio.com/items?itemName=yourusername.api-forge)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Status](https://img.shields.io/badge/status-active-success)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [📦 Example](#-example)
- [⚙️ Configuration](#️-configuration)
- [🎯 Supported Frameworks](#-supported-frameworks)
- [📁 Output Structure](#-output-structure)
- [🛠️ Commands](#️-commands)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)
- [🙏 Support](#-support)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Automatic Detection** | Scans your backend routes and generates API clients instantly |
| 🔗 **Nested Router Support** | Handles complex Express router hierarchies |
| ⚡ **Axios Integration** | Generates clean, production-ready Axios functions |
| 🧠 **Smart Naming** | Creates intuitive function names like `getUsers`, `createUser`, `updateUserById` |
| 🔄 **Watch Mode** | Automatically regenerates APIs when backend files change |
| 🧩 **Dynamic Params** | Converts `:id` routes to `${params.id}` with validation |
| 📁 **Modular Output** | Optional file splitting by resource or router |
| 🧼 **Clean Generation** | Removes stale APIs before each generation |

---

## 🚀 Quick Start

### Installation

1. Open **Visual Studio Code**
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for **"APIForge"**
4. Click **Install**

Or install via command line:

```bash
code --install-extension yourusername.api-forge
```

### First Use

1. Open your backend project (Express.js) in VSCode
2. Open any route file (e.g., `routes/users.js`)
3. Run the command:
   - Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Type `APIForge: Generate API`
   - Press Enter
4. Or click the **⚡ APIForge** button in the editor toolbar

Your APIs will be generated instantly!

---

## 📦 Example

### 🔹 Backend Code (Express.js)

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

router.get('/users');
router.get('/users/:id');
router.post('/users');
router.put('/users/:id');
router.delete('/users/:id');
router.get('/users/:id/posts');

module.exports = router;
```

### 🔹 Generated API Client

```javascript
// output/users.js
import api from './api-client';

/**
 * Get all users
 * @param {Object} params - Request parameters
 * @param {Object} params.query - Query parameters
 */
export const getUsers = ({ query } = {}) => {
  return api.get('/users', { params: query });
};

/**
 * Get user by ID
 * @param {Object} params - Request parameters
 * @param {string} params.id - User ID (required)
 * @param {Object} params.query - Query parameters
 */
export const getUserById = ({ params, query } = {}) => {
  if (!params?.id) throw new Error("Missing required parameter: id");
  return api.get(`/users/${params.id}`, { params: query });
};

/**
 * Create new user
 * @param {Object} params - Request parameters
 * @param {Object} params.data - Request body data
 */
export const createUser = ({ data } = {}) => {
  return api.post('/users', data);
};

/**
 * Update user by ID
 * @param {Object} params - Request parameters
 * @param {string} params.id - User ID (required)
 * @param {Object} params.data - Request body data
 */
export const updateUserById = ({ params, data } = {}) => {
  if (!params?.id) throw new Error("Missing required parameter: id");
  return api.put(`/users/${params.id}`, data);
};

/**
 * Delete user by ID
 * @param {Object} params - Request parameters
 * @param {string} params.id - User ID (required)
 */
export const deleteUserById = ({ params } = {}) => {
  if (!params?.id) throw new Error("Missing required parameter: id");
  return api.delete(`/users/${params.id}`);
};

/**
 * Get posts for user
 * @param {Object} params - Request parameters
 * @param {string} params.id - User ID (required)
 * @param {Object} params.query - Query parameters
 */
export const getUserPostsById = ({ params, query } = {}) => {
  if (!params?.id) throw new Error("Missing required parameter: id");
  return api.get(`/users/${params.id}/posts`, { params: query });
};
```

### 🔹 Using the Generated API

```javascript
import { getUsers, getUserById, createUser } from './output/users';

// Get all users
const users = await getUsers();

// Get specific user
const user = await getUserById({ params: { id: 123 } });

// Create new user
const newUser = await createUser({ 
  data: { name: 'John', email: 'john@example.com' } 
});
```

---

## ⚙️ Configuration

APIForge can be customized through VSCode settings:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `apiForge.autoGenerate` | `boolean` | `true` | Automatically regenerate APIs when route files change |
| `apiForge.splitFiles` | `boolean` | `false` | Generate separate API files per router |
| `apiForge.cleanOutput` | `boolean` | `true` | Remove old API files before regeneration |
| `apiForge.outputDir` | `string` | `"output"` | Directory where API files are generated |
| `apiForge.apiClientPath` | `string` | `"./api-client"` | Path to your API client instance |
| `apiForge.includeJSDoc` | `boolean` | `true` | Include JSDoc comments in generated code |
| `apiForge.axiosImport` | `boolean` | `true` | Import axios directly or use custom client |
| `apiForge.routePatterns` | `array` | `["routes/**/*.js", "**/*.route.js"]` | Glob patterns to detect route files |

### Configuration Example

```json
{
  "apiForge.autoGenerate": true,
  "apiForge.splitFiles": true,
  "apiForge.outputDir": "src/services/api",
  "apiForge.apiClientPath": "@/utils/axios"
}
```

---

## 🎯 Supported Frameworks

### ✅ Currently Supported

- **Express.js** (Node.js)

### 🚧 Coming Soon

- **FastAPI** (Python)
- **Flask** (Python)
- **Django REST Framework** (Python)
- **Koa.js** (Node.js)
- **NestJS** (TypeScript)

---

## 📁 Output Structure

### Without File Splitting (`splitFiles: false`)

```
output/
├── api.js           # All API functions in one file
└── index.js         # Barrel export
```

### With File Splitting (`splitFiles: true`)

```
output/
├── users.js         # User-related API functions
├── products.js      # Product-related API functions
├── orders.js        # Order-related API functions
├── api-client.js    # Shared axios instance
└── index.js         # Barrel export
```

---

## 🛠️ Commands

| Command | Description |
|---------|-------------|
| `APIForge: Generate API` | Manually trigger API generation |
| `APIForge: Watch Routes` | Start watching for route file changes |
| `APIForge: Stop Watching` | Stop watching for route file changes |
| `APIForge: Clear Output` | Remove all generated API files |
| `APIForge: Configure` | Open APIForge settings |

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup

1. Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/api-forge.git
cd api-forge
```

2. Install dependencies:

```bash
npm install
```

3. Open in VSCode:

```bash
code .
```

4. Press `F5` to start debugging

### Ways to Contribute

- 🐛 Report bugs via [GitHub Issues](https://github.com/YOUR_USERNAME/api-forge/issues)
- 💡 Suggest features or improvements
- 📝 Improve documentation
- 🔧 Submit pull requests

### Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## 🙏 Support

If you encounter any issues or have questions:

- 📫 [Open an issue](https://github.com/YOUR_USERNAME/api-forge/issues)
- 📧 Email: your-email@example.com
- 💬 [Discord Community](https://discord.gg/your-invite)

---

## 🌟 Show Your Support

If you find APIForge useful, please consider:

- ⭐ Starring the repository on GitHub
- 📝 Writing a review on the VSCode Marketplace
- 🐦 Sharing it on [Twitter](https://twitter.com/intent/tweet?text=Check%20out%20APIForge%20-%20automatically%20generate%20frontend%20API%20code%20from%20backend%20routes!%20https://github.com/YOUR_USERNAME/api-forge)
- 🔗 Mentioning it in your blog or documentation

---

## 📊 Project Status

- **Version:** 1.0.0
- **Status:** Active Development
- **Last Updated:** March 2026

---

## 🗺️ Roadmap

### v1.1.0

- [ ] Support for TypeScript output
- [ ] Custom templates for API generation
- [ ] Multiple API client support (fetch, axios, etc.)

### v1.2.0

- [ ] FastAPI support
- [ ] OpenAPI/Swagger integration
- [ ] API request/response type generation

### v2.0.0

- [ ] GraphQL support
- [ ] WebSocket support
- [ ] Multi-framework detection

---

Made with ❤️ by [Your Name](https://github.com/YOUR_USERNAME)
```

This README follows proper Markdown formatting with:
- Clean heading hierarchy (`#`, `##`, `###`)
- Properly formatted code blocks with language identifiers
- Tables for structured data
- Lists and checkboxes
- Badges at the top
- Consistent spacing and organization
- Emojis for visual appeal
- Links that will work when rendered on GitHub or VSCode Marketplace

You can save this as `README.md` in your project root. Just replace `YOUR_USERNAME` and `your-email@example.com` with your actual details.
