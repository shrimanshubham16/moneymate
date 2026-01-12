import { useNavigate, useLocation } from "react-router-dom";
import { FaChartLine, FaCog } from "react-icons/fa";
import { NotificationCenter } from "./NotificationCenter";
import "./AppHeader.css";

interface AppHeaderProps {
  onLogout?: () => void;
  token?: string;
}

export function AppHeader({ onLogout, token }: AppHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isSettings = location.pathname.startsWith("/settings");

  return (
    <header className="app-header">
      <div className="header-left">
        <button 
          className="logo-button" 
          onClick={() => navigate("/dashboard")}
          title="Go to Dashboard"
        >
          <FaChartLine size={32} className="logo-icon" />
          <span className="logo-text">FinFlow</span>
        </button>
      </div>
      
      <div className="header-right">
        {token && <NotificationCenter token={token} />}
        <button 
          className="header-nav-button"
          onClick={() => navigate("/settings")}
        >
          <FaCog style={{ marginRight: 6 }} />
          Settings
        </button>
      </div>
    </header>
  );
}

