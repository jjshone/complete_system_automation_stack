import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../App';
import * as Icons from 'lucide-react';
import { Maximize2, Minimize2, Info, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const ServicePanel = ({ service, isMaximized, onMaximize, onViewDetails }) => {
  const [loading, setLoading] = useState(true);
  const Icon = Icons[service.icon] || Icons.Box;
  
  // Get the iframe URL for the service
  const getServiceUrl = () => {
    if (service.ports && service.ports.length > 0) {
      const port = service.ports[0].split(':')[0];
      return `http://localhost:${port}`;
    }
    
    // Demo URLs for services when containers aren't running
    const demoUrls = {
      'minio': 'https://play.min.io/login',
      'n8n': 'https://n8n.io/demo',
      'grafana': 'https://play.grafana.org',
      'grist': 'https://docs.getgrist.com/doc/new',
      'code-server': 'https://vscode.dev',
      'dbeaver': 'https://dbeaver.com/database-demo/',
    };
    
    return demoUrls[service.id] || null;
  };

  const serviceUrl = getServiceUrl();
  const hasIframe = serviceUrl !== null;

  const getStatusColor = (status) => {
    if (status === 'running' || hasIframe) return 'bg-green-500';
    if (status === 'stopped') return 'bg-zinc-500';
    return 'bg-yellow-500';
  };

  const getStatusBadge = (status) => {
    if (status === 'running' || hasIframe) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Running</Badge>;
    }
    if (status === 'stopped') {
      return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/50">Stopped</Badge>;
    }
    return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Unknown</Badge>;
  };

  return (
    <div
      className="h-full glass-panel rounded-xl transition-all duration-300 hover:border-cyan-500/50 flex flex-col overflow-hidden"
      data-testid={`service-panel-${service.id}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/5 bg-black/40 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate" data-testid={`service-name-${service.id}`}>
              {service.name}
            </h3>
            <p className="text-xs text-zinc-500 truncate">{service.category}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)} animate-pulse`} />
          {getStatusBadge(service.status)}
          
          <Button
            size="icon"
            variant="ghost"
            onClick={onViewDetails}
            className="h-7 w-7 text-zinc-400 hover:text-white"
            data-testid={`info-button-${service.id}`}
          >
            <Info className="w-4 h-4" />
          </Button>
          
          <Button
            size="icon"
            variant="ghost"
            onClick={onMaximize}
            className="h-7 w-7 text-zinc-400 hover:text-white"
            data-testid={`maximize-button-${service.id}`}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Content Area - Iframe or placeholder */}
      <div className="flex-1 relative bg-zinc-950 overflow-hidden">
        {hasIframe ? (
          <iframe
            src={serviceUrl}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            title={service.name}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            data-testid={`iframe-${service.id}`}
          />
        ) : (
          <div className="flex items-center justify-center h-full p-6 text-center">
            <div>
              <Icon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 mb-2">{service.description}</p>
              <p className="text-xs text-zinc-600">No UI available for this service</p>
              {service.ports && service.ports.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-zinc-500 mb-1">Ports:</p>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {service.ports.map((port, idx) => (
                      <span key={idx} className="text-xs px-2 py-1 rounded bg-black/30 text-zinc-400 font-mono">
                        {port}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {loading && hasIframe && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-zinc-400">Loading {service.name}...</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with quick info */}
      {!isMaximized && (
        <div className="p-2 border-t border-white/5 bg-black/20 flex items-center justify-between text-xs flex-shrink-0">
          <span className="text-zinc-500">
            {service.status === 'running' || hasIframe ? 'Active' : 'Ready to start'}
          </span>
          {hasIframe && (
            <a 
              href={serviceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Open
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}
    </div>
  );
};

export default ServicePanel;