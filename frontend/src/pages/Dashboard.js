import { useState, useEffect, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import axios from 'axios';
import { API_URL } from '../App';
import ServicePanel from '../components/ServicePanel';
import Sidebar from '../components/Sidebar';
import AddServiceModal from '../components/AddServiceModal';
import ServiceDetailsModal from '../components/ServiceDetailsModal';
import { toast } from 'sonner';
import { RefreshCw, Save, LayoutGrid, Search, Filter, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const Dashboard = () => {
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [websocket, setWebsocket] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('split'); // split or grid
  const [maximizedPanel, setMaximizedPanel] = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/services`);
      const servicesData = response.data;
      
      // Auto-start all enabled services
      const enabledServices = servicesData.filter(s => s.enabled);
      for (const service of enabledServices) {
        if (service.status === 'stopped') {
          try {
            await axios.post(`${API_URL}/containers/${service.id}/start`);
          } catch (err) {
            console.error(`Failed to start ${service.id}:`, err);
          }
        }
      }
      
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('Failed to fetch services');
    }
  }, []);

  useEffect(() => {
    fetchServices();
    
    const wsUrl = API_URL.replace('http', 'ws') + '/ws';
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      toast.success('Connected to orchestration server');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WebSocket message:', data);
      
      if (data.type === 'service_updated' || data.type === 'container_started' || data.type === 'container_stopped') {
        fetchServices();
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };
    
    setWebsocket(ws);
    
    const interval = setInterval(fetchServices, 30000);
    
    return () => {
      ws.close();
      clearInterval(interval);
    };
  }, [fetchServices]);

  useEffect(() => {
    let filtered = services.filter(s => s.enabled);
    
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => s.category === categoryFilter);
    }
    
    setFilteredServices(filtered);
  }, [services, searchQuery, categoryFilter]);

  const generateLayout = () => {
    if (maximizedPanel) {
      return [{
        i: maximizedPanel,
        x: 0,
        y: 0,
        w: 12,
        h: 8,
        minW: 12,
        minH: 8,
      }];
    }
    
    return filteredServices.map((service, index) => ({
      i: service.id,
      x: (index % 2) * 6,
      y: Math.floor(index / 2) * 4,
      w: 6,
      h: 4,
      minW: 3,
      minH: 3,
    }));
  };

  const handleLayoutChange = (layout, layouts) => {
    setLayouts(layouts);
  };

  const handleSaveLayout = async () => {
    try {
      await axios.post(`${API_URL}/layouts`, {
        name: `Layout ${Date.now()}`,
        layout_data: generateLayout(),
        is_default: false,
      });
      toast.success('Layout saved successfully');
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Failed to save layout');
    }
  };

  const handleToggleService = async (serviceId, enabled) => {
    try {
      await axios.patch(`${API_URL}/services/${serviceId}/enable?enabled=${!enabled}`);
      toast.success(enabled ? 'Service disabled' : 'Service enabled');
      fetchServices();
    } catch (error) {
      console.error('Error toggling service:', error);
      toast.error('Failed to toggle service');
    }
  };

  const handleMaximizePanel = (serviceId) => {
    setMaximizedPanel(maximizedPanel === serviceId ? null : serviceId);
  };

  const categories = ['all', ...new Set(services.map(s => s.category))];
  const displayServices = maximizedPanel 
    ? filteredServices.filter(s => s.id === maximizedPanel)
    : filteredServices;

  return (
    <div className="min-h-screen relative" data-testid="dashboard-container">
      <Sidebar 
        onAddService={() => setShowAddModal(true)}
        services={services}
        onToggleService={handleToggleService}
      />
      
      <div className="ml-16 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1" data-testid="dashboard-title">
              Orchestration Workspace
            </h1>
            <p className="text-sm text-zinc-400" data-testid="dashboard-subtitle">
              Tiling window manager for containerized services
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                setRefreshKey(prev => prev + 1);
                fetchServices();
              }}
              variant="outline"
              size="sm"
              className="rounded-full bg-white/10 text-white hover:bg-white/20 border-white/10"
              data-testid="refresh-button"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            
            <Button
              onClick={handleSaveLayout}
              variant="outline"
              size="sm"
              className="rounded-full bg-white/10 text-white hover:bg-white/20 border-white/10"
              data-testid="save-layout-button"
            >
              <Save className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 glass-panel rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-black/40 border-white/10 text-white"
                data-testid="search-input"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px] bg-black/40 border-white/10 text-white" data-testid="category-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10">
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-black/40">
              <LayoutGrid className="w-4 h-4 text-cyan-500" />
              <span className="text-sm font-medium text-white" data-testid="active-services-count">
                {filteredServices.length} / {services.filter(s => s.enabled).length}
              </span>
            </div>
          </div>
        </div>

        {displayServices.length === 0 ? (
          <div className="glass-panel rounded-xl p-12 text-center" data-testid="empty-state">
            <div className="max-w-md mx-auto">
              <LayoutGrid className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-white mb-2">
                {searchQuery || categoryFilter !== 'all' ? 'No services found' : 'No Active Services'}
              </h3>
              <p className="text-zinc-400 mb-6">
                {searchQuery || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Enable services from the sidebar to get started'
                }
              </p>
              {!searchQuery && categoryFilter === 'all' && (
                <Button
                  onClick={() => setShowAddModal(true)}
                  className="rounded-full bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                  data-testid="add-service-button"
                >
                  Add Service
                </Button>
              )}
            </div>
          </div>
        ) : (
          <GridLayout
            key={refreshKey + '-' + maximizedPanel}
            className="layout"
            layout={generateLayout()}
            cols={12}
            rowHeight={100}
            width={1800}
            onLayoutChange={handleLayoutChange}
            isDraggable={!maximizedPanel}
            isResizable={!maximizedPanel}
            compactType="vertical"
            preventCollision={false}
          >
            {displayServices.map((service) => (
              <div key={service.id} data-testid={`service-panel-${service.id}`}>
                <ServicePanel
                  service={service}
                  isMaximized={maximizedPanel === service.id}
                  onMaximize={() => handleMaximizePanel(service.id)}
                  onViewDetails={() => setSelectedService(service)}
                />
              </div>
            ))}
          </GridLayout>
        )}
      </div>

      <AddServiceModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={() => {
          setShowAddModal(false);
          fetchServices();
        }}
      />

      <ServiceDetailsModal
        service={selectedService}
        onClose={() => setSelectedService(null)}
      />
    </div>
  );
};

export default Dashboard;