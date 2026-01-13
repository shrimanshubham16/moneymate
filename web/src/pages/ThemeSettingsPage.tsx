import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FaArrowLeft, FaMoon, FaSun } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { applyTheme, getCurrentTheme, ThemeName } from "../theme";
import "./ThemeSettingsPage.css";

export function ThemeSettingsPage() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<ThemeName>("dark");

  useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const handleSetTheme = (next: ThemeName) => {
    setTheme(next);
    applyTheme(next);
  };

  return (
    <motion.div
      className="theme-settings-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="page-header">
        <button className="back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft /> Back
        </button>
        <h1>Themes</h1>
      </div>

      <p className="theme-description">
        Choose your look. Dark stays default; Light is great for bright environments.
      </p>

      <div className="theme-grid">
        <div
          className={`theme-card ${theme === "dark" ? "active" : ""}`}
          onClick={() => handleSetTheme("dark")}
        >
          <div className="theme-icon dark"><FaMoon /></div>
          <h3>Dark</h3>
          <p>Neon accents, deep navy backgrounds.</p>
          {theme === "dark" && <span className="theme-badge">Active</span>}
        </div>

        <div
          className={`theme-card ${theme === "light" ? "active" : ""}`}
          onClick={() => handleSetTheme("light")}
        >
          <div className="theme-icon light"><FaSun /></div>
          <h3>Light</h3>
          <p>Clean whites and soft shadows for daytime.</p>
          {theme === "light" && <span className="theme-badge">Active</span>}
        </div>
      </div>
    </motion.div>
  );
}
