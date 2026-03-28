# ⚡ APIForge

> Automatically generate frontend API code from backend routes — instantly.

![VSCode](https://img.shields.io/badge/VSCode-Extension-blue?logo=visualstudiocode)
![License](https://img.shields.io/badge/license-MIT-green)
![Status](https://img.shields.io/badge/status-active-success)

---

## 🚀 Features

* 🔍 Automatic route detection
* 🔗 Supports nested routers
* ⚡ Generates clean Axios API functions
* 🧠 Smart naming (`getUsers`, `createUser`, `deleteUser`, etc.)
* 🔄 Auto-update on file changes (watch mode)
* 🧩 Dynamic params support (`:id → ${params.id}`)
* 📁 Optional file splitting
* 🧼 Clean output (removes stale APIs)

---

## 📦 Example

### 🔹 Backend (Express)

```js
router.get('/users/:id');
router.post('/users');
router.delete('/users/:id');
```

### 🔹 Generated API

```js
export const getUserById = ({ params, query } = {}) => {
  if (!params?.id) throw new Error("Missing param: id");
  return api.get(`/users/${params.id}`, { params: query });
};

export const createUser = ({ data } = {}) => {
  return api.post('/users', data);
};

export const deleteUser = ({ params } = {}) => {
  if (!params?.id) throw new Error("Missing param: id");
  return api.delete(`/users/${params.id}`);
};
```

---

## ⚙️ Usage

1. Open your backend project in VSCode
2. Run command:

```
APIForge: Generate API
```

3. Or click the ⚡ button in the editor
4. APIs will be generated automatically

---

## 🧠 Configuration

| Setting        | Description                         |
| -------------- | ----------------------------------- |
| `autoGenerate` | Auto-generate APIs on file changes  |
| `splitFiles`   | Generate separate API files         |
| `cleanOutput`  | Remove old APIs before regenerating |
| `outputDir`    | Output folder for generated APIs    |

---

## 📁 Output

Generated APIs are placed inside:

```
/output
```

---

## 🛠 Supported Backend

* ✅ Express.js

🚧 Coming soon:

* FastAPI
* Flask

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

---

## 📬 Support

👉 https://github.com/rajankumar2511/ApiForge/issues

---

## 🔗 Repository

👉 https://github.com/rajankumar2511/ApiForge

---

## 👨‍💻 Author

**Rajan Kumar**
GitHub: https://github.com/rajankumar2511

---

## ⭐ Show your support

If you like this project, give it a star ⭐
