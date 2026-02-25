import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../App';
import * as Icons from 'lucide-react';
import { Play, Square, RotateCw, Activity } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const ServiceCard = ({ service, onToggle, onStart, onStop, onRestart, onClick }) => {
  const [stats, setStats] = useState({ cpu_percent: 0, memory_usage_mb: 0, memory_percent: 0 });
  const Icon = Icons[service.icon] || Icons.Box;

  useEffect(() => {
    if (service.status === 'running') {
      const fetchStats = async () => {
        try {
          const response = await axios.get(`${API_URL}/containers/${service.id}/stats`);
          setStats(response.data);
        } catch (error) {
          console.error('Error fetching stats:', error);
        }
      };

      fetchStats();
      const interval = setInterval(fetchStats, 10000);

      return () => clearInterval(interval);
    }
  }, [service.status, service.id]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'stopped':
        return 'bg-zinc-500';
      case 'exited':
        return 'bg-red-500';
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Running</Badge>;
      case 'stopped':
        return <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/50">Stopped</Badge>;
      case 'exited':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/50">Exited</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">Unknown</Badge>;
    }
  };

  return (
    <div
      className="h-full glass-panel rounded-xl transition-all duration-300 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] group cursor-pointer flex flex-col"
      onClick={() => onClick(service)}
      data-testid={`service-card-${service.id}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white" data-testid={`service-name-${service.id}`}>
              {service.name}
            </h3>
            <p className="text-xs text-zinc-500">{service.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor(service.status)} animate-pulse`} />
          {getStatusBadge(service.status)}
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-y-auto scrollbar-thin">
        <p className="text-sm text-zinc-400 line-clamp-2">{service.description}</p>

        {service.status === 'running' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">CPU</span>
              <span className="text-cyan-400 font-mono font-semibold">{stats.cpu_percent.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-1.5">
              <div
                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.cpu_percent, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Memory</span>
              <span className="text-cyan-400 font-mono font-semibold">
                {stats.memory_usage_mb.toFixed(0)}MB ({stats.memory_percent.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-black/40 rounded-full h-1.5">
              <div
                className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(stats.memory_percent, 100)}%` }}
              />
            </div>
          </div>
        )}

        {service.ports && service.ports.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Ports</p>
            <div className="flex flex-wrap gap-1">
              {service.ports.slice(0, 3).map((port, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 rounded bg-black/30 text-zinc-400 font-mono"
                >
                  {port}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-black/20">
        <div className="flex items-center gap-2">
          {service.status === 'running' ? (
            <>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onStop(service.id);
                }}
                className="flex-1 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50"
                data-testid={`stop-button-${service.id}`}
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </Button>
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestart(service.id);
                }}
                className="flex-1 rounded-full bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/50"
                data-testid={`restart-button-${service.id}`}
              >
                <RotateCw className="w-3 h-3 mr-1" />
                Restart
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onStart(service.id);
              }}
              className="flex-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50"
              data-testid={`start-button-${service.id}`}
            >
              <Play className="w-3 h-3 mr-1" />
              Start
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceCard;