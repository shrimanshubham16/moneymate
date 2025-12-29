# 🎨 Theme System Design - v2.0

## 🎯 Goals

- Multiple theme options
- Matrix theme
- Anime theme
- Easy theme switching
- Persistent theme selection

---

## 🏗️ Architecture

### Theme Structure

```typescript
type Theme = {
  id: string;
  name: string;
  displayName: string;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
  };
  fonts: {
    heading: string;
    body: string;
    mono: string;
  };
  effects: {
    background: "matrix" | "anime" | "gradient" | "solid";
    loader: "matrix" | "anime" | "spinner";
    animations: "matrix" | "anime" | "smooth";
  };
  styles: {
    borderRadius: string;
    shadows: string;
    transitions: string;
  };
}
```

---

## 🎨 Available Themes

### 1. Matrix Theme

**Colors:**
- Background: #000000 (Pure black)
- Primary: #00ff41 (Matrix green)
- Text: #00ff41
- Accent: #00ff41
- Surface: #0a0a0a

**Fonts:**
- Heading: 'Courier New', monospace
- Body: 'Courier New', monospace

**Effects:**
- Background: Matrix rain animation
- Loader: Matrix loader (already implemented)
- Animations: Glitch effects, digital transitions

**Visual Style:**
- Dark, cyberpunk aesthetic
- Green glow effects
- Monospace fonts
- Digital/tech feel

### 2. Anime Theme

**Colors:**
- Background: #f0f4f8 (Light blue-gray)
- Primary: #ff6b9d (Pink)
- Secondary: #4ecdc4 (Cyan)
- Text: #2d3748
- Accent: #ffd93d (Yellow)

**Fonts:**
- Heading: 'Comic Sans MS', 'Arial Rounded', sans-serif
- Body: 'Segoe UI', sans-serif

**Effects:**
- Background: Particle animations, sakura petals
- Loader: Anime-style spinner
- Animations: Bounce, fade, slide

**Visual Style:**
- Bright, vibrant colors
- Rounded corners
- Playful animations
- Friendly, approachable

### 3. Default Theme (Current)

**Keep existing CRED/Blissy design**
- Professional
- Modern
- Clean

---

## 🎯 Implementation

### Theme Context

```typescript
const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  availableThemes: Theme[];
}>();

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme());
  
  useEffect(() => {
    localStorage.setItem('theme', theme.id);
    document.documentElement.setAttribute('data-theme', theme.id);
  }, [theme]);
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### CSS Variables

```css
:root[data-theme="matrix"] {
  --bg-primary: #000000;
  --text-primary: #00ff41;
  --accent: #00ff41;
  /* ... */
}

:root[data-theme="anime"] {
  --bg-primary: #f0f4f8;
  --text-primary: #2d3748;
  --accent: #ff6b9d;
  /* ... */
}
```

### Theme Switcher UI

```
Settings → Appearance → Theme
[Matrix] [Anime] [Default]
     ↑ Selected
```

---

## 🚀 Implementation Steps

1. **Theme System** (Week 1)
   - Create theme context
   - Define theme structure
   - Implement CSS variables

2. **Matrix Theme** (Week 2)
   - Matrix colors
   - Matrix fonts
   - Matrix effects
   - Background animation

3. **Anime Theme** (Week 3)
   - Anime colors
   - Anime fonts
   - Anime effects
   - Particle animations

4. **Theme Switcher** (Week 4)
   - UI component
   - Persistence
   - Preview mode

---

**Target: 3 beautiful themes, easy switching** 🎨

