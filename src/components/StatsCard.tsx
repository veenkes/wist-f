import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  iconColor?: string;
  iconBgColor?: string;
  subtitle?: string;
  onClick?: () => void;
  loading?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  trendDirection = 'neutral',
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/10',
  subtitle,
  onClick,
  loading = false,
}) => {
  const getTrendColor = () => {
    switch (trendDirection) {
      case 'up':
        return 'text-success';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className="shadow-card h-full">
        <CardContent className="p-4 h-full flex flex-col">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="h-4 bg-muted rounded animate-pulse flex-1 min-w-0"></div>
            <div className="w-10 h-10 bg-muted rounded-lg animate-pulse flex-shrink-0"></div>
          </div>
          <div className="h-7 bg-muted rounded animate-pulse w-32"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className={`shadow-card hover:shadow-widget transition-all duration-200 h-full ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4 h-full flex flex-col">
        {/* Top section - Label and Icon */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-sm font-medium text-muted-foreground flex-1 min-w-0">
            {title}
          </p>
          <div className={`p-2.5 rounded-lg flex-shrink-0 ${iconBgColor}`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>

        {/* Bottom section - Content */}
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-xl font-semibold text-foreground leading-tight break-words">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

