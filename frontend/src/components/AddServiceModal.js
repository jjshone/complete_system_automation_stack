import { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../App';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

const AddServiceModal = ({ open, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'tool',
    image: '',
    tag: 'latest',
    description: '',
    icon: 'Box',
  });
  const [ports, setPorts] = useState(['']);
  const [envVars, setEnvVars] = useState([{ key: '', value: '' }]);
  const [volumes, setVolumes] = useState(['']);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const filteredPorts = ports.filter((p) => p.trim() !== '');
    const filteredEnvVars = envVars
      .filter((ev) => ev.key.trim() !== '' && ev.value.trim() !== '')
      .reduce((acc, ev) => ({ ...acc, [ev.key]: ev.value }), {});
    const filteredVolumes = volumes.filter((v) => v.trim() !== '');

    try {
      await axios.post(`${API_URL}/services`, {
        ...formData,
        ports: filteredPorts,
        env_vars: filteredEnvVars,
        volumes: filteredVolumes,
      });
      toast.success('Service added successfully');
      onSuccess();
      resetForm();
    } catch (error) {
      console.error('Error adding service:', error);
      toast.error('Failed to add service: ' + (error.response?.data?.detail || error.message));
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'tool',
      image: '',
      tag: 'latest',
      description: '',
      icon: 'Box',
    });
    setPorts(['']);
    setEnvVars([{ key: '', value: '' }]);
    setVolumes(['']);
  };

  const addPort = () => setPorts([...ports, '']);
  const removePort = (index) => setPorts(ports.filter((_, i) => i !== index));
  const updatePort = (index, value) => {
    const newPorts = [...ports];
    newPorts[index] = value;
    setPorts(newPorts);
  };

  const addEnvVar = () => setEnvVars([...envVars, { key: '', value: '' }]);
  const removeEnvVar = (index) => setEnvVars(envVars.filter((_, i) => i !== index));
  const updateEnvVar = (index, field, value) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = value;
    setEnvVars(newEnvVars);
  };

  const addVolume = () => setVolumes([...volumes, '']);
  const removeVolume = (index) => setVolumes(volumes.filter((_, i) => i !== index));
  const updateVolume = (index, value) => {
    const newVolumes = [...volumes];
    newVolumes[index] = value;
    setVolumes(newVolumes);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass-panel-heavy border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin" data-testid="add-service-modal">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">Add New Service</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Configure and deploy a new containerized service
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Service Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-black/40 border-white/10 text-white"
                placeholder="My Service"
                required
                data-testid="service-name-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" className="text-zinc-300">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger className="bg-black/40 border-white/10 text-white" data-testid="category-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
                  <SelectItem value="automation">Automation</SelectItem>
                  <SelectItem value="orchestration">Orchestration</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="etl">ETL</SelectItem>
                  <SelectItem value="monitoring">Monitoring</SelectItem>
                  <SelectItem value="cache">Cache</SelectItem>
                  <SelectItem value="messaging">Messaging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="image" className="text-zinc-300">Docker Image</Label>
              <Input
                id="image"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                className="bg-black/40 border-white/10 text-white"
                placeholder="nginx"
                required
                data-testid="image-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tag" className="text-zinc-300">Tag</Label>
              <Input
                id="tag"
                value={formData.tag}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                className="bg-black/40 border-white/10 text-white"
                placeholder="latest"
                data-testid="tag-input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-black/40 border-white/10 text-white resize-none"
              placeholder="Service description..."
              rows={2}
              data-testid="description-input"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Ports</Label>
              <Button type="button" size="sm" onClick={addPort} variant="ghost" className="text-cyan-400" data-testid="add-port-button">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {ports.map((port, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={port}
                  onChange={(e) => updatePort(index, e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                  placeholder="8080:80"
                  data-testid={`port-input-${index}`}
                />
                <Button type="button" size="icon" onClick={() => removePort(index)} variant="ghost" className="text-red-400">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Environment Variables</Label>
              <Button type="button" size="sm" onClick={addEnvVar} variant="ghost" className="text-cyan-400" data-testid="add-env-button">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {envVars.map((envVar, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={envVar.key}
                  onChange={(e) => updateEnvVar(index, 'key', e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                  placeholder="KEY"
                  data-testid={`env-key-input-${index}`}
                />
                <Input
                  value={envVar.value}
                  onChange={(e) => updateEnvVar(index, 'value', e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                  placeholder="value"
                  data-testid={`env-value-input-${index}`}
                />
                <Button type="button" size="icon" onClick={() => removeEnvVar(index)} variant="ghost" className="text-red-400">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-300">Volumes</Label>
              <Button type="button" size="sm" onClick={addVolume} variant="ghost" className="text-cyan-400" data-testid="add-volume-button">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {volumes.map((volume, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={volume}
                  onChange={(e) => updateVolume(index, e.target.value)}
                  className="bg-black/40 border-white/10 text-white"
                  placeholder="volume-name:/path"
                  data-testid={`volume-input-${index}`}
                />
                <Button type="button" size="icon" onClick={() => removeVolume(index)} variant="ghost" className="text-red-400">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="rounded-full bg-white/10 text-white hover:bg-white/20 border-white/10" data-testid="cancel-button">
              Cancel
            </Button>
            <Button type="submit" className="rounded-full bg-cyan-600 text-white hover:bg-cyan-500 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]" data-testid="submit-button">
              Add Service
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddServiceModal;