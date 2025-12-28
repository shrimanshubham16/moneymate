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
                    <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13.41 18.09V19.5C13.41 20.05 12.96 20.5 12.41 20.5H11.59C11.04 20.5 10.59 20.05 10.59 19.5V18.07C9.56 17.89 8.66 17.42 8 16.76L9.06 15.18C9.67 15.76 10.54 16.18 11.59 16.18C12.45 16.18 13.09 15.81 13.09 15.09C13.09 14.43 12.59 14.09 11.34 13.68C9.58 13.11 8.41 12.35 8.41 10.68C8.41 9.31 9.4 8.23 10.59 7.93V6.5C10.59 5.95 11.04 5.5 11.59 5.5H12.41C12.96 5.5 13.41 5.95 13.41 6.5V7.95C14.2 8.12 14.87 8.45 15.41 8.91L14.41 10.54C13.89 10.13 13.18 9.82 12.27 9.82C11.36 9.82 10.91 10.23 10.91 10.77C10.91 11.38 11.5 11.68 12.77 12.11C14.65 12.71 15.59 13.5 15.59 15.09C15.59 16.5 14.56 17.71 13.41 18.09Z" fill="currentColor" />
                    </svg>
                    <span className="logo-text">MoneyMate</span>
                </div>
            </Link>
        </header>
    );
}
