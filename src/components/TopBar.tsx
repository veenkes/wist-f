import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sun, 
  Moon, 
  Languages
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface TopBarProps {
  title?: string;
  actions?: React.ReactNode;
}

const TopBar: React.FC<TopBarProps> = ({ title, actions }) => {
  const { theme, language, toggleTheme, toggleLanguage } = useTheme();
  
  const getLanguageLabel = () => {
    switch (language) {
      case 'en': return 'EN';
      case 'ru': return 'RU';
      case 'uz': return 'UZ';
      default: return 'EN';
    }
  };

  return (
    <header className="bg-background/80 backdrop-blur-sm border-b border-border shadow-card">
      <div className="flex items-center justify-between px-6 py-4 gap-6">
        {/* Left Side - Page Title */}
        {title && (
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-foreground truncate">{title}</h1>
          </div>
        )}

        {/* Right Side - Actions + System Controls */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Page Actions */}
          {actions && (
            <>
              {actions}
              <div className="w-px h-6 bg-border mx-1" />
            </>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="relative"
          >
            {theme === 'light' ? (
              <Moon className="w-4 h-4" />
            ) : (
              <Sun className="w-4 h-4" />
            )}
          </Button>

          {/* Language Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            className="relative"
            title={`Current: ${getLanguageLabel()}`}
          >
            <Languages className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;