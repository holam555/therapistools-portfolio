import { Link } from 'react-router-dom';
import ProfileSwitcher from '@/components/ProfileSwitcher';

interface Props {
  /** Optional right-aligned slot (e.g. editor toolbar actions). */
  right?: React.ReactNode;
}

export default function SiteHeader({ right }: Props) {
  return (
    <header className="no-print border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 sm:gap-7">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-105">
              {/* A printed page: this tool's icon (the Therapistools mark sits in the bar above). */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 2.5h8.5L19 7v14.5H6z" />
                <path d="M14 2.5V7h5" />
                <path d="M9 12h7M9 15.5h7M9 19h4" strokeDasharray="1.5 2.2" />
              </svg>
            </div>
            <div>
              <h1 className="font-display text-lg font-extrabold text-foreground leading-tight">Worksheets</h1>
              <p className="text-[11px] text-muted-foreground leading-none">Printable worksheets for kids</p>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm font-semibold text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition-colors">Worksheets</Link>
            <Link to="/guides" className="hover:text-foreground transition-colors">Guides</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <ProfileSwitcher />
          {right}
        </div>
      </div>
    </header>
  );
}
