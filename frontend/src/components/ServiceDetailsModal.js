import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Play, Square, RotateCw, Activity, Terminal, Info } from 'lucide-react';
import * as Icons from 'lucide-react';
import { toast } from 'sonner';

const ServiceDetailsModal = ({ service, onClose }) => {
  const [logs, setLogs] = useState('');
  const [stats, setStats] = useState({ cpu_percent: 0, memory_usage_mb: 0, memory_percent: 0 });

  useEffect(() => {
    if (service && service.status === 'running') {
      fetchLogs();
      fetchStats();
      
      const statsInterval = setInterval(fetchStats, 5000);
      return () => clearInterval(statsInterval);
    }
  }, [service]);

  const fetchLogs = async () => {
    if (!service) return;
    try {
      const response = await axios.get(`${API_URL}/containers/${service.id}/logs?tail=100`);
      setLogs(response.data.logs);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const fetchStats = async () => {
    if (!service) return;
    try {
      const response = await axios.get(`${API_URL}/containers/${service.id}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  if (!service) return null;

  const Icon = Icons[service.icon] || Icons.Box;

  return (
    <Dialog open={!!service} onOpenChange={onClose}>
      <DialogContent className="glass-panel-heavy border-white/10 max-w-4xl max-h-[90vh]" data-testid="service-details-modal">
        <DialogHeader>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <Icon className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-white">{service.name}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className="bg-zinc-700/50 text-zinc-300">{service.category}</Badge>
                {service.status === 'running' && (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Running</Badge>
                )}
                {service.status === 'stopped' && (
                  <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/50">Stopped</Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="overview" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-black/40">
            <TabsTrigger value="overview" data-testid="overview-tab">Overview</TabsTrigger>
            <TabsTrigger value="logs" data-testid="logs-tab">Logs</TabsTrigger>
            <TabsTrigger value="stats" data-testid="stats-tab">Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="glass-panel-light rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Info className="w-4 h-4" />
                Service Information
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Image</span>
                  <span className="text-white font-mono">{service.image}:{service.tag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Container ID</span>
                  <span className="text-white font-mono text-xs">
                    {service.container_id ? service.container_id.slice(0, 12) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Status</span>
                  <span className="text-white">{service.status}</span>
                </div>
              </div>
            </div>

            {service.description && (
              <div className="glass-panel-light rounded-lg p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Description</h3>
                <p className="text-sm text-zinc-400">{service.description}</p>
              </div>
            )}

            {service.ports && service.ports.length > 0 && (
              <div className="glass-panel-light rounded-lg p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Ports</h3>
                <div className="flex flex-wrap gap-2">
                  {service.ports.map((port, idx) => (
                    <span key={idx} className="px-3 py-1 rounded bg-black/40 text-cyan-400 font-mono text-sm">
                      {port}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {service.env_vars && Object.keys(service.env_vars).length > 0 && (
              <div className="glass-panel-light rounded-lg p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-2">Environment Variables</h3>
                <div className="space-y-1 text-sm font-mono">
                  {Object.entries(service.env_vars).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs">
                      <span className="text-zinc-400">{key}</span>
                      <span className="text-zinc-500">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs">
            <div className="glass-panel-light rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  Container Logs (Last 100 lines)
                </h3>
                <Button size="sm" onClick={fetchLogs} variant="ghost" className="text-cyan-400" data-testid="refresh-logs-button">
                  <RotateCw className="w-3 h-3" />
                </Button>
              </div>
              <ScrollArea className="h-[400px] w-full rounded bg-black/60 p-3">
                <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap">
                  {logs || 'No logs available'}
                </pre>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="stats">
            <div className="glass-panel-light rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Performance Metrics
              </h3>

              {service.status === 'running' ? (
                <>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-400">CPU Usage</span>
                        <span className="text-lg font-bold text-cyan-400 font-mono">
                          {stats.cpu_percent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-black/40 rounded-full h-3">
                        <div
                          className="bg-cyan-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(stats.cpu_percent, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-zinc-400">Memory Usage</span>
                        <span className="text-lg font-bold text-cyan-400 font-mono">
                          {stats.memory_usage_mb.toFixed(0)}MB ({stats.memory_percent.toFixed(2)}%)
                        </span>
                      </div>
                      <div className="w-full bg-black/40 rounded-full h-3">
                        <div
                          className="bg-cyan-500 h-3 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(stats.memory_percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-zinc-500 text-center py-8">Container is not running</p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ServiceDetailsModal;