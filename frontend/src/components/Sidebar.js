import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../App';
import * as Icons from 'lucide-react';
import { Plus, Settings, Layers } from 'lucide-react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { toast } from 'sonner';

const Sidebar = ({ onAddService, services, onToggleService }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {});

  return (
    <div
      className="fixed left-0 top-0 h-full transition-all duration-300 z-50 glass-panel-heavy border-r border-white/10 flex flex-col overflow-hidden"
      style={{ width: isExpanded ? '320px' : '64px' }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      data-testid="sidebar"
    >
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          {isExpanded && (
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-white whitespace-nowrap">Services</h2>
              <p className="text-xs text-zinc-500 whitespace-nowrap">Manage containers</p>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {Object.entries(groupedServices).map(([category, categoryServices]) => (
          <div key={category} className="mb-4">
            {isExpanded && (
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider px-3 py-2">
                {category}
              </h3>
            )}
            {categoryServices.map((service) => {
              const Icon = Icons[service.icon] || Icons.Box;
              return (
                <div
                  key={service.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-all group mb-1"
                  data-testid={`sidebar-service-${service.id}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-zinc-900/50 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                  </div>
                  {isExpanded && (
                    <>
                      <div className="flex-1 overflow-hidden">
                        <p className="text-sm text-white font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {service.name}
                        </p>
                        <p className="text-xs text-zinc-500 whitespace-nowrap">{service.status}</p>
                      </div>
                      <Switch
                        checked={service.enabled}
                        onCheckedChange={() => onToggleService(service.id, service.enabled)}
                        className="data-[state=checked]:bg-cyan-500"
                        data-testid={`toggle-service-${service.id}`}
                      />
                    </>
                  )}
                </div>
              );
            })}
            {isExpanded && <Separator className="my-2 bg-white/5" />}
          </div>
        ))}
      </ScrollArea>

      <div className="p-4 border-t border-white/5">
        <Button
          onClick={onAddService}
          className="w-full rounded-full bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
          size={isExpanded ? 'default' : 'icon'}
          data-testid="sidebar-add-service"
        >
          <Plus className="w-4 h-4" />
          {isExpanded && <span className="ml-2">Add Service</span>}
        </Button>
      </div>
    </div>
  );
};

export default Sidebar;