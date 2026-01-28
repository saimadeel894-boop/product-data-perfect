import { useState, useEffect } from 'react';
import { wooCommerceHealthApi, HealthCheckResult, HealthStatus } from '@/lib/api/woocommerceHealth';
import { CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const statusConfig: Record<HealthStatus, { icon: typeof CheckCircle; color: string; label: string }> = {
  connected: {
    icon: CheckCircle,
    color: 'text-green-500',
    label: 'Connected',
  },
  authentication_failed: {
    icon: XCircle,
    color: 'text-red-500',
    label: 'Auth Failed',
  },
  invalid_credentials: {
    icon: AlertCircle,
    color: 'text-orange-500',
    label: 'Invalid Credentials',
  },
  network_error: {
    icon: WifiOff,
    color: 'text-red-500',
    label: 'Network Error',
  },
  missing_credentials: {
    icon: AlertCircle,
    color: 'text-yellow-500',
    label: 'Missing Credentials',
  },
};

interface ApiHealthStatusProps {
  compact?: boolean;
  autoCheck?: boolean;
}

export const ApiHealthStatus = ({ compact = false, autoCheck = true }: ApiHealthStatusProps) => {
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = async () => {
    setIsChecking(true);
    console.log('[UI] Starting health check...');
    
    try {
      const result = await wooCommerceHealthApi.checkHealth();
      console.log('[UI] Health check result:', result);
      setHealthResult(result);
    } catch (error) {
      console.error('[UI] Health check error:', error);
      setHealthResult({
        status: 'network_error',
        message: 'Failed to perform health check',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (autoCheck) {
      checkHealth();
    }
  }, [autoCheck]);

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        {!compact && <span className="text-sm">Checking API...</span>}
      </div>
    );
  }

  if (!healthResult) {
    return (
      <Button variant="ghost" size="sm" onClick={checkHealth} className="gap-2">
        <Wifi className="w-4 h-4" />
        {!compact && 'Check Connection'}
      </Button>
    );
  }

  const config = statusConfig[healthResult.status];
  const Icon = config.icon;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${config.color}`} />
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={checkHealth}>
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              <p className="text-xs text-muted-foreground">{healthResult.message}</p>
              {healthResult.details?.store_name && (
                <p className="text-xs">Store: {healthResult.details.store_name}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Last checked: {new Date(healthResult.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <span className="font-medium">{config.label}</span>
        </div>
        <Button variant="outline" size="sm" onClick={checkHealth} className="gap-2">
          <RefreshCw className="w-3 h-3" />
          Refresh
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{healthResult.message}</p>

      {healthResult.details && (
        <div className="flex flex-wrap gap-2">
          <Badge variant={healthResult.details.url_configured ? 'default' : 'destructive'}>
            URL {healthResult.details.url_configured ? '✓' : '✗'}
          </Badge>
          <Badge variant={healthResult.details.consumer_key_configured ? 'default' : 'destructive'}>
            API Key {healthResult.details.consumer_key_configured ? '✓' : '✗'}
          </Badge>
          <Badge variant={healthResult.details.consumer_secret_configured ? 'default' : 'destructive'}>
            Secret {healthResult.details.consumer_secret_configured ? '✓' : '✗'}
          </Badge>
          {healthResult.details.api_reachable !== undefined && (
            <Badge variant={healthResult.details.api_reachable ? 'default' : 'destructive'}>
              Reachable {healthResult.details.api_reachable ? '✓' : '✗'}
            </Badge>
          )}
        </div>
      )}

      {healthResult.details?.store_name && (
        <div className="text-xs text-muted-foreground">
          <p>Store: {healthResult.details.store_name}</p>
          {healthResult.details.wc_version && <p>WooCommerce: v{healthResult.details.wc_version}</p>}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Last checked: {new Date(healthResult.timestamp).toLocaleString()}
      </p>
    </div>
  );
};
