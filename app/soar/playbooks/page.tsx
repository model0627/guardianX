'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Play, 
  Save, 
  ChevronLeft,
  Filter,
  Code,
  Activity,
  Settings,
  FileText,
  Zap,
  Database,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  GitBranch,
  Terminal,
  Layers,
  Box,
  MessageSquare,
  Mail,
  Slack,
  Send,
  MoreVertical,
  ArrowRight,
  Circle,
  Square,
  Diamond
} from 'lucide-react';

interface PlaybookNode {
  id: string;
  type: 'start' | 'action' | 'condition' | 'filter' | 'decision' | 'format' | 'code' | 'utility' | 'prompt' | 'end';
  category: string;
  name: string;
  description?: string;
  x: number;
  y: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  config?: any;
  outputs?: string[];
  inputs?: string[];
}

interface Connection {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface Playbook {
  id: string;
  name: string;
  description: string;
  nodes: PlaybookNode[];
  connections: Connection[];
  status: 'draft' | 'active' | 'inactive';
  last_modified: string;
  execution_count: number;
}

export default function PlaybooksPage() {
  const [selectedPlaybook, setSelectedPlaybook] = useState<Playbook | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [showActionPanel, setShowActionPanel] = useState(true);
  const [selectedNode, setSelectedNode] = useState<PlaybookNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<any>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [draggedNodePosition, setDraggedNodePosition] = useState<{nodeId: string, startX: number, startY: number} | null>(null);
  const [isNodeDragging, setIsNodeDragging] = useState(false);
  const [connectionMode, setConnectionMode] = useState(false);
  const [sourceNode, setSourceNode] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // 액션 카테고리와 노드 타입들
  const actionCategories = [
    {
      category: 'EXECUTE ACTIONS',
      items: [
        { type: 'action', icon: Activity, name: 'Action', color: 'bg-green-500' },
        { type: 'playbook', icon: FileText, name: 'Playbook', color: 'bg-purple-500' },
        { type: 'code', icon: Code, name: 'Code', color: 'bg-blue-500' },
        { type: 'utility', icon: Settings, name: 'Utility', color: 'bg-pink-500' }
      ]
    },
    {
      category: 'PROCESS FILTERS',
      items: [
        { type: 'filter', icon: Filter, name: 'Filter', color: 'bg-blue-500' },
        { type: 'decision', icon: GitBranch, name: 'Decision', color: 'bg-green-500' },
        { type: 'format', icon: FileText, name: 'Format', color: 'bg-red-500' }
      ]
    },
    {
      category: 'HUMAN INPUT',
      items: [
        { type: 'prompt', icon: MessageSquare, name: 'Prompt', color: 'bg-yellow-500' }
      ]
    }
  ];

  useEffect(() => {
    document.title = '자동 대응 - GuardianX';
    loadPlaybooks();
  }, []);

  const loadPlaybooks = () => {
    // 샘플 플레이북 데이터
    const samplePlaybooks: Playbook[] = [
      {
        id: '1',
        name: 'Phishing Enrichment',
        description: 'Automated phishing email analysis and response',
        status: 'active',
        last_modified: new Date().toISOString(),
        execution_count: 247,
        nodes: [
          {
            id: 'start',
            type: 'start',
            category: 'control',
            name: 'Start',
            x: 400,
            y: 50,
            outputs: ['node1']
          },
          {
            id: 'node1',
            type: 'action',
            category: 'action',
            name: 'File Reputation',
            description: 'Check file reputation in threat intelligence',
            x: 350,
            y: 150,
            status: 'completed',
            inputs: ['start'],
            outputs: ['node2', 'node3', 'node4']
          },
          {
            id: 'node2',
            type: 'action',
            category: 'action',
            name: 'Domain Reputation',
            description: 'Check domain reputation',
            x: 200,
            y: 250,
            status: 'completed',
            inputs: ['node1'],
            outputs: ['node5']
          },
          {
            id: 'node3',
            type: 'action',
            category: 'action',
            name: 'IP Reputation',
            description: 'Check IP address reputation',
            x: 500,
            y: 250,
            status: 'completed',
            inputs: ['node1'],
            outputs: ['node6']
          },
          {
            id: 'node4',
            type: 'action',
            category: 'action',
            name: 'Whois Domain',
            description: 'Get domain registration info',
            x: 350,
            y: 350,
            status: 'pending',
            inputs: ['node1'],
            outputs: ['node7']
          },
          {
            id: 'node5',
            type: 'action',
            category: 'action',
            name: 'Geolocate IP',
            description: 'Get IP geolocation',
            x: 200,
            y: 450,
            inputs: ['node2'],
            outputs: ['node8']
          },
          {
            id: 'node6',
            type: 'action',
            category: 'action',
            name: 'URL Reputation',
            description: 'Check URL reputation',
            x: 500,
            y: 450,
            inputs: ['node3'],
            outputs: ['node8']
          },
          {
            id: 'node7',
            type: 'action',
            category: 'action',
            name: 'IP Intelligence',
            description: 'Get IP threat intelligence',
            x: 350,
            y: 550,
            inputs: ['node4'],
            outputs: ['node8']
          },
          {
            id: 'node8',
            type: 'code',
            category: 'code',
            name: 'Calculate Threat Risk',
            description: 'Calculate overall threat risk score',
            x: 350,
            y: 650,
            inputs: ['node5', 'node6', 'node7'],
            outputs: ['node9']
          },
          {
            id: 'node9',
            type: 'format',
            category: 'format',
            name: 'Format Investigation Note',
            description: 'Format results for investigation',
            x: 350,
            y: 750,
            inputs: ['node8'],
            outputs: ['node10']
          },
          {
            id: 'node10',
            type: 'utility',
            category: 'utility',
            name: 'Create Note',
            description: 'Create investigation note',
            x: 350,
            y: 850,
            inputs: ['node9'],
            outputs: ['end']
          },
          {
            id: 'end',
            type: 'end',
            category: 'control',
            name: 'End',
            x: 350,
            y: 950,
            inputs: ['node10']
          }
        ],
        connections: [
          { id: 'c1', source: 'start', target: 'node1' },
          { id: 'c2', source: 'node1', target: 'node2' },
          { id: 'c3', source: 'node1', target: 'node3' },
          { id: 'c4', source: 'node1', target: 'node4' },
          { id: 'c5', source: 'node2', target: 'node5' },
          { id: 'c6', source: 'node3', target: 'node6' },
          { id: 'c7', source: 'node4', target: 'node7' },
          { id: 'c8', source: 'node5', target: 'node8' },
          { id: 'c9', source: 'node6', target: 'node8' },
          { id: 'c10', source: 'node7', target: 'node8' },
          { id: 'c11', source: 'node8', target: 'node9' },
          { id: 'c12', source: 'node9', target: 'node10' },
          { id: 'c13', source: 'node10', target: 'end' }
        ]
      },
      {
        id: '2',
        name: 'Malware Response',
        description: 'Automated malware detection and containment',
        status: 'active',
        last_modified: new Date().toISOString(),
        execution_count: 156,
        nodes: [],
        connections: []
      },
      {
        id: '3',
        name: 'Brute Force Mitigation',
        description: 'Detect and respond to brute force attacks',
        status: 'inactive',
        last_modified: new Date().toISOString(),
        execution_count: 89,
        nodes: [],
        connections: []
      }
    ];
    
    setPlaybooks(samplePlaybooks);
    setSelectedPlaybook(samplePlaybooks[0]);
  };

  const handleActionDragStart = (e: React.DragEvent, nodeType: any) => {
    setIsDragging(true);
    setDraggedNode(nodeType);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (draggedNode && selectedPlaybook) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;
      
      const newNode: PlaybookNode = {
        id: `node_${Date.now()}`,
        type: draggedNode.type as any,
        category: draggedNode.type,
        name: draggedNode.name,
        x: x - 50,
        y: y - 25,
        inputs: [],
        outputs: []
      };
      
      setSelectedPlaybook({
        ...selectedPlaybook,
        nodes: [...selectedPlaybook.nodes, newNode]
      });
    }
    setDraggedNode(null);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'action': return Activity;
      case 'playbook': return FileText;
      case 'code': return Code;
      case 'utility': return Settings;
      case 'filter': return Filter;
      case 'decision': return GitBranch;
      case 'format': return FileText;
      case 'prompt': return MessageSquare;
      default: return Circle;
    }
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'start': return 'bg-gray-600';
      case 'end': return 'bg-gray-600';
      case 'action': return 'bg-green-500';
      case 'playbook': return 'bg-purple-500';
      case 'code': return 'bg-blue-500';
      case 'utility': return 'bg-pink-500';
      case 'filter': return 'bg-blue-500';
      case 'decision': return 'bg-green-500';
      case 'format': return 'bg-red-500';
      case 'prompt': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const renderConnection = (connection: Connection) => {
    const sourceNode = selectedPlaybook?.nodes.find(n => n.id === connection.source);
    const targetNode = selectedPlaybook?.nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return null;
    
    const x1 = sourceNode.x + 75;
    const y1 = sourceNode.y + 30;
    const x2 = targetNode.x + 75;
    const y2 = targetNode.y + 30;
    
    // Calculate control points for curved path
    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx = x1 + dx / 2;
    const cy1 = y1 + dy * 0.3;
    const cy2 = y2 - dy * 0.3;
    
    return (
      <g key={connection.id}>
        <path
          d={`M ${x1} ${y1} C ${cx} ${cy1}, ${cx} ${cy2}, ${x2} ${y2}`}
          stroke="#6B7280"
          strokeWidth="2"
          fill="none"
          markerEnd="url(#arrowhead)"
        />
      </g>
    );
  };

  const handleNodeDragStart = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggedNodePosition({
      nodeId,
      startX: e.clientX,
      startY: e.clientY
    });
    setIsNodeDragging(true);
  };

  const handleNodeDrag = (e: React.MouseEvent) => {
    if (!isNodeDragging || !draggedNodePosition || !selectedPlaybook) return;
    
    const deltaX = (e.clientX - draggedNodePosition.startX) / zoom;
    const deltaY = (e.clientY - draggedNodePosition.startY) / zoom;
    
    const updatedNodes = selectedPlaybook.nodes.map(node => {
      if (node.id === draggedNodePosition.nodeId) {
        return {
          ...node,
          x: Math.max(0, node.x + deltaX),
          y: Math.max(0, node.y + deltaY)
        };
      }
      return node;
    });
    
    setSelectedPlaybook({
      ...selectedPlaybook,
      nodes: updatedNodes
    });
    
    setDraggedNodePosition({
      ...draggedNodePosition,
      startX: e.clientX,
      startY: e.clientY
    });
  };

  const handleNodeDragEnd = () => {
    setIsNodeDragging(false);
    setDraggedNodePosition(null);
  };

  const handleExecutePlaybook = async () => {
    if (!selectedPlaybook) return;
    
    setIsExecuting(true);
    
    // 시뮬레이션된 실행 과정
    const nodes = [...selectedPlaybook.nodes];
    
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].type === 'start' || nodes[i].type === 'end') continue;
      
      // 실행 상태로 변경
      const updatedNodes = nodes.map(node => 
        node.id === nodes[i].id ? { ...node, status: 'running' } : node
      );
      
      setSelectedPlaybook({
        ...selectedPlaybook,
        nodes: updatedNodes
      });
      
      // 실행 시간 시뮬레이션 (0.5-2초)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1500 + 500));
      
      // 완료 상태로 변경 (95% 성공률)
      const finalStatus = Math.random() < 0.95 ? 'completed' : 'failed';
      const finalNodes = nodes.map(node => 
        node.id === nodes[i].id ? { ...node, status: finalStatus } : node
      );
      
      setSelectedPlaybook({
        ...selectedPlaybook,
        nodes: finalNodes,
        execution_count: selectedPlaybook.execution_count + 1
      });
      
      if (finalStatus === 'failed') break; // 실패 시 중단
    }
    
    setIsExecuting(false);
  };

  const renderNode = (node: PlaybookNode) => {
    const Icon = getNodeIcon(node.type);
    const color = getNodeColor(node.type);
    
    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        className={`cursor-move ${isNodeDragging ? 'select-none' : ''}`}
        onClick={() => setSelectedNode(node)}
        onMouseDown={(e) => handleNodeDragStart(node.id, e)}
      >
        {/* Node background */}
        <rect
          x="0"
          y="0"
          width="150"
          height="60"
          rx="8"
          className={`${selectedNode?.id === node.id ? 'stroke-orange-500 stroke-2' : 'stroke-gray-300'} fill-white`}
        />
        
        {/* Node icon */}
        <foreignObject x="10" y="15" width="30" height="30">
          <div className={`w-8 h-8 ${color} rounded flex items-center justify-center`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </foreignObject>
        
        {/* Node text */}
        <text x="45" y="25" className="fill-gray-900 text-xs font-medium">
          {node.category?.toUpperCase()}
        </text>
        <text x="45" y="40" className="fill-gray-600 text-xs">
          {node.name}
        </text>
        
        {/* Status indicator */}
        {node.status && (
          <g>
            <circle
              cx="135"
              cy="15"
              r="6"
              className={
                node.status === 'completed' ? 'fill-green-500' :
                node.status === 'running' ? 'fill-yellow-500' :
                node.status === 'failed' ? 'fill-red-500' :
                'fill-gray-500'
              }
            />
            {node.status === 'running' && (
              <circle
                cx="135"
                cy="15"
                r="6"
                className="fill-none stroke-yellow-300 stroke-2"
              >
                <animate
                  attributeName="r"
                  values="6;10;6"
                  dur="1s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="1;0;1"
                  dur="1s"
                  repeatCount="indefinite"
                />
              </circle>
            )}
          </g>
        )}
        
        {/* Connection points */}
        <circle cx="75" cy="0" r="4" className="fill-gray-400" />
        <circle cx="75" cy="60" r="4" className="fill-gray-400" />
      </g>
    );
  };

  return (
    <div className="flex h-full bg-white">
      {/* Left Sidebar - Action Panel */}
      <div className={`${showActionPanel ? 'w-64' : 'w-0'} transition-all duration-300 bg-gray-50 border-r border-gray-200 overflow-hidden`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-semibold">Add</h3>
            <button
              onClick={() => setShowActionPanel(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>
          
          {/* Action Categories */}
          <div className="space-y-6">
            {actionCategories.map((category) => (
              <div key={category.category}>
                <h4 className="text-gray-600 text-xs font-semibold mb-3">{category.category}</h4>
                <div className="space-y-2">
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.type}
                        draggable
                        onDragStart={(e) => handleActionDragStart(e, item)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-move group"
                      >
                        <div className={`w-8 h-8 ${item.color} rounded flex items-center justify-center`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-gray-700 text-sm">{item.name}</span>
                        <Circle className="w-4 h-4 text-gray-400 ml-auto opacity-0 group-hover:opacity-100" />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {!showActionPanel && (
                <button
                  onClick={() => setShowActionPanel(true)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ChevronLeft className="w-5 h-5 rotate-180" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-500" />
                <span className="text-gray-900 font-semibold">SOAR</span>
              </div>
              <h1 className="text-gray-900 text-lg font-medium">
                {selectedPlaybook?.name || 'Select a Playbook'}
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-sm">Repo: local</span>
              <button 
                onClick={handleExecutePlaybook}
                disabled={isExecuting || !selectedPlaybook}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  isExecuting 
                    ? 'bg-yellow-600 text-white cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Play className="w-4 h-4" />
                {isExecuting ? 'Executing...' : 'Execute'}
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>

        {/* Playbook Tabs */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-1 px-4">
            {playbooks.map((playbook) => (
              <button
                key={playbook.id}
                onClick={() => setSelectedPlaybook(playbook)}
                className={`px-4 py-2 text-sm ${
                  selectedPlaybook?.id === playbook.id
                    ? 'bg-white text-gray-900 border-t-2 border-blue-500'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {playbook.name}
              </button>
            ))}
            <button className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div 
          className="flex-1 bg-gray-50 relative overflow-hidden"
          onDrop={handleCanvasDrop}
          onDragOver={handleCanvasDragOver}
          onMouseMove={handleNodeDrag}
          onMouseUp={handleNodeDragEnd}
          onMouseLeave={handleNodeDragEnd}
        >
          {isDragging && (
            <div className="absolute inset-0 border-2 border-dashed border-blue-500 bg-blue-500 bg-opacity-10 z-10 pointer-events-none">
              <div className="flex items-center justify-center h-full">
                <span className="text-blue-500 text-lg">Drop here to add node</span>
              </div>
            </div>
          )}
          
          <svg
            className="w-full h-full"
            viewBox="0 0 1200 800"
            style={{ width: '100%', height: '100%' }}
          >
            {/* Define arrow marker */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6B7280"
                />
              </marker>
            </defs>
            
            {/* Grid pattern */}
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.5" fill="#D1D5DB" />
            </pattern>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Render connections */}
            {selectedPlaybook?.connections.map(renderConnection)}
            
            {/* Render nodes */}
            {selectedPlaybook?.nodes.map(renderNode)}
          </svg>
        </div>

        {/* Bottom Status Bar */}
        <div className="bg-white border-t border-gray-200 px-6 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <span className="text-gray-600 text-sm">Python Playbook Editor</span>
              <span className="text-gray-600 text-sm">
                Nodes: {selectedPlaybook?.nodes.length || 0}
              </span>
              <span className="text-gray-600 text-sm">
                Connections: {selectedPlaybook?.connections.length || 0}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className={`text-sm flex items-center gap-2 ${
                isExecuting ? 'text-yellow-500' : 'text-green-500'
              }`}>
                {isExecuting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Executing Playbook...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Playbook: Active
                  </>
                )}
              </span>
              <span className="text-gray-600 text-sm">
                Executions: {selectedPlaybook?.execution_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Node Properties (Optional) */}
      {selectedNode && (
        <div className="w-80 bg-white border-l border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-semibold">Node Properties</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-600 hover:text-gray-900"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="text-gray-600 text-xs">Type</label>
              <p className="text-gray-900">{selectedNode.type}</p>
            </div>
            <div>
              <label className="text-gray-600 text-xs">Name</label>
              <input
                type="text"
                value={selectedNode.name}
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 px-3 py-2 rounded mt-1"
                readOnly
              />
            </div>
            <div>
              <label className="text-gray-600 text-xs">Description</label>
              <textarea
                value={selectedNode.description || ''}
                className="w-full bg-gray-50 text-gray-900 border border-gray-300 px-3 py-2 rounded mt-1"
                rows={3}
                readOnly
              />
            </div>
            <div>
              <label className="text-gray-600 text-xs">Status</label>
              <p className="text-gray-900 capitalize">{selectedNode.status || 'Not executed'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}