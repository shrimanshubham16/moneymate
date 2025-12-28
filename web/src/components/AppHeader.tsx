import { useNavigate, useLocation } from "react-router-dom";
import { MdAccountBalanceWallet } from "react-icons/md";
import { FaCog } from "react-icons/fa";
import "./AppHeader.css";

interface AppHeaderProps {
  onLogout?: () => void;
}

export function AppHeader({ onLogout }: AppHeaderProps) {
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
          <MdAccountBalanceWallet size={32} className="logo-icon" />
          <span className="logo-text">MoneyMate</span>
        </button>
      </div>
      
      <div className="header-right">
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

