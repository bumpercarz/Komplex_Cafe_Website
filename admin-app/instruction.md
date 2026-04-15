### 1️⃣ Install Node.js first (if not yet)

Check:

```bash
node -v
```

If not installed → download from:
👉 [https://nodejs.org](https://nodejs.org)

---

### 2️⃣ Create project (recommended: Vite — faster)

In terminal:

```bash
npm create vite@latest komplex-cafe
```

Choose:

```
React
JavaScript
```

Then:

```bash
cd komplex-cafe
npm install
npm run dev
```

You should see:

```
Local: http://localhost:5173
```

Open that in browser ✅

---

### 3️⃣ Add the files

Inside `src/`:

### Create folders

```
src/
  assets/
  pages/
```

### Put:

* your image → `src/assets/login-bg.png`
* `LoginPage.jsx` → `src/pages/`
* `LoginPage.css` → `src/pages/`

---

### 4️⃣ Replace App.jsx

```jsx
import LoginPage from "./pages/LoginPage";

function App() {
  return <LoginPage />;
}

export default App;
```

---

### 5️⃣ Start server

```bash
npm run dev
```

Boom. Your login page shows up 🔥

---

---

# 🚀 Option B — If you ALREADY have a React project

Just:

### 1️⃣ Add files

```
src/pages/LoginPage.jsx
src/pages/LoginPage.css
src/assets/login-bg.png
```

### 2️⃣ Import in App.jsx

```jsx
import LoginPage from "./pages/LoginPage";
```

### 3️⃣ Run

If Vite:

```bash
npm run dev
```

If Create React App:

```bash
npm start
```

---

# 🧠 Quick sanity checklist

If something breaks:

✅ image path correct?
✅ CSS imported?
✅ `npm install` done?
✅ Node installed?

---
To make the routers run: In your terminal:

```bash
npm install react-router-dom
```

---
To make charts work

```bash
npm i recharts
```
---
To make firebase work

```bash
npm install firebase
```

---
Create .env.local file in the root folder. Copy paste this. 

```bash
VITE_FIREBASE_API_KEY=AIzaSyDiJn0IEpYIIUEu1xap4kAfcwyB_vsK4NA
VITE_FIREBASE_AUTH_DOMAIN=komplexcafeoops.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=komplexcafeoops
VITE_FIREBASE_STORAGE_BUCKET=komplexcafeoops.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=849720119469
VITE_FIREBASE_APP_ID=1:849720119469:web:19b0362cc0cc5649ddf624
```