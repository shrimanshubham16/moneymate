import { Link, useNavigate } from "react-router-dom";
import { MdAccountBalanceWallet, MdSettings } from "react-icons/md";
import { FaFileExport } from "react-icons/fa";
import { NotificationCenter } from "./NotificationCenter";
import "./Header.css";

interface HeaderProps {
    showLogo?: boolean;
    token?: string;
}

export function Header({ showLogo = true, token }: HeaderProps) {
    const navigate = useNavigate();

    if (!showLogo) return null;

    return (
        <header className="app-header">
            <Link to="/dashboard" className="logo-link">
                <div className="logo">
                    <span className="logo-icon">
                        <MdAccountBalanceWallet size={32} />
                    </span>
                    <span className="logo-text">FinFlow</span>
                </div>
            </Link>

            <div className="header-actions">
                {token && <NotificationCenter token={token} />}
                <button className="header-button" onClick={() => navigate("/export")} title="Export Data">
                    <FaFileExport size={20} />
                    <span className="button-text">Export</span>
                </button>
                <button className="header-button" onClick={() => navigate("/settings")} title="Settings">
                    <MdSettings size={20} />
                    <span className="button-text">Settings</span>
                </button>
            </div>
        </header>
    );
}
