import { useState, useEffect, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import axios from 'axios';
import { API_URL } from '../App';
import ServiceCard from '../components/ServiceCard';
import Sidebar from '../components/Sidebar';
import AddServiceModal from '../components/AddServiceModal';
import ServiceDetailsModal from '../components/ServiceDetailsModal';
import { toast } from 'sonner';
import { RefreshCw, Save, LayoutGrid } from 'lucide-react';
import { Button } from '../components/ui/button';

const Dashboard = () => {
  const [services, setServices] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [websocket, setWebsocket] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchServices = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/services`);
      setServices(response.data);
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

  const generateLayout = () => {
    return services
      .filter(s => s.enabled)
      .map((service, index) => ({
        i: service.id,
        x: (index % 3) * 4,
        y: Math.floor(index / 3) * 3,
        w: 4,
        h: 3,
        minW: 3,
        minH: 2,
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

  const handleStartContainer = async (serviceId) => {
    try {
      toast.loading('Starting container...', { id: serviceId });
      await axios.post(`${API_URL}/containers/${serviceId}/start`);
      toast.success('Container started successfully', { id: serviceId });
      setTimeout(fetchServices, 2000);
    } catch (error) {
      console.error('Error starting container:', error);
      toast.error('Failed to start container: ' + (error.response?.data?.detail || error.message), { id: serviceId });
    }
  };

  const handleStopContainer = async (serviceId) => {
    try {
      toast.loading('Stopping container...', { id: serviceId });
      await axios.post(`${API_URL}/containers/${serviceId}/stop`);
      toast.success('Container stopped successfully', { id: serviceId });
      setTimeout(fetchServices, 2000);
    } catch (error) {
      console.error('Error stopping container:', error);
      toast.error('Failed to stop container: ' + (error.response?.data?.detail || error.message), { id: serviceId });
    }
  };

  const handleRestartContainer = async (serviceId) => {
    try {
      toast.loading('Restarting container...', { id: serviceId });
      await axios.post(`${API_URL}/containers/${serviceId}/restart`);
      toast.success('Container restarted successfully', { id: serviceId });
      setTimeout(fetchServices, 2000);
    } catch (error) {
      console.error('Error restarting container:', error);
      toast.error('Failed to restart container: ' + (error.response?.data?.detail || error.message), { id: serviceId });
    }
  };

  const handleServiceClick = (service) => {
    setSelectedService(service);
  };

  const enabledServices = services.filter(s => s.enabled);

  return (
    <div className="min-h-screen relative" data-testid="dashboard-container">
      <Sidebar onAddService={() => setShowAddModal(true)} />
      
      <div className="ml-16 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-2" data-testid="dashboard-title">
              Orchestration Workspace
            </h1>
            <p className="text-base text-zinc-400" data-testid="dashboard-subtitle">
              Manage and monitor your containerized services
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={() => {
                setRefreshKey(prev => prev + 1);
                fetchServices();
              }}
              variant="outline"
              className="rounded-full bg-white/10 text-white hover:bg-white/20 border-white/10"
              data-testid="refresh-button"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            <Button
              onClick={handleSaveLayout}
              variant="outline"
              className="rounded-full bg-white/10 text-white hover:bg-white/20 border-white/10"
              data-testid="save-layout-button"
            >
              <Save className="w-4 h-4 mr-2" />
              Save Layout
            </Button>
          </div>
        </div>

        <div className="mb-6 glass-panel rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-cyan-500" />
              <span className="text-zinc-300 font-medium">Active Services</span>
            </div>
            <span className="text-2xl font-bold text-cyan-500" data-testid="active-services-count">
              {enabledServices.length} / {services.length}
            </span>
          </div>
        </div>

        {enabledServices.length === 0 ? (
          <div className="glass-panel rounded-xl p-12 text-center" data-testid="empty-state">
            <div className="max-w-md mx-auto">
              <LayoutGrid className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
              <h3 className="text-2xl font-semibold text-white mb-2">No Active Services</h3>
              <p className="text-zinc-400 mb-6">
                Enable services from the sidebar or add a new service to get started
              </p>
              <Button
                onClick={() => setShowAddModal(true)}
                className="rounded-full bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                data-testid="add-service-button"
              >
                Add Service
              </Button>
            </div>
          </div>
        ) : (
          <ResponsiveGridLayout
            key={refreshKey}
            className="layout"
            layouts={{ lg: generateLayout() }}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
            cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
            rowHeight={100}
            onLayoutChange={handleLayoutChange}
            isDraggable={true}
            isResizable={true}
            compactType="vertical"
            preventCollision={false}
          >
            {enabledServices.map((service) => (
              <div key={service.id} data-testid={`service-panel-${service.id}`}>
                <ServiceCard
                  service={service}
                  onToggle={handleToggleService}
                  onStart={handleStartContainer}
                  onStop={handleStopContainer}
                  onRestart={handleRestartContainer}
                  onClick={handleServiceClick}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
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