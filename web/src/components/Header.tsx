import { Link } from "react-router-dom";
import "./Header.css";

interface HeaderProps {
    showLogo?: boolean;
}

export function Header({ showLogo = true }: HeaderProps) {
    if (!showLogo) return null;

    return (
        <header className="app-header">
            <Link to="/dashboard" className="logo-link">
                <div className="logo">
                    <span className="logo-icon">💰</span>
                    <span className="logo-text">MoneyMate</span>
                </div>
            </Link>
        </header>
    );
}
