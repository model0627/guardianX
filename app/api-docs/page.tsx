// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, CheckCircle, Lock, Globe } from 'lucide-react';

export default function ApiDocs() {
  const [spec, setSpec] = useState<any>(null);
  const [expandedTags, setExpandedTags] = useState<Set<string>>(new Set());
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // 페이지 타이틀 설정
    document.title = 'API 문서 - GuardianX IPAM';
    
    fetch('/api/docs')
      .then(res => res.json())
      .then(data => setSpec(data));
  }, []);

  const toggleTag = (tag: string) => {
    const newExpanded = new Set(expandedTags);
    if (newExpanded.has(tag)) {
      newExpanded.delete(tag);
    } else {
      newExpanded.add(tag);
    }
    setExpandedTags(newExpanded);
  };

  const toggleEndpoint = (key: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedEndpoints(newExpanded);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEndpoint(key);
    setTimeout(() => setCopiedEndpoint(null), 2000);
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-green-500 text-white';
      case 'POST': return 'bg-blue-500 text-white';
      case 'PUT': return 'bg-yellow-500 text-white';
      case 'DELETE': return 'bg-red-500 text-white';
      case 'PATCH': return 'bg-purple-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getMethodBorderColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'border-green-200 dark:border-green-800';
      case 'POST': return 'border-blue-200 dark:border-blue-800';
      case 'PUT': return 'border-yellow-200 dark:border-yellow-800';
      case 'DELETE': return 'border-red-200 dark:border-red-800';
      case 'PATCH': return 'border-purple-200 dark:border-purple-800';
      default: return 'border-gray-200 dark:border-gray-800';
    }
  };

  const filterEndpoints = (endpoints: any[]) => {
    if (!searchTerm) return endpoints;
    return endpoints.filter(([path, methods]) => {
      const pathMatch = path.toLowerCase().includes(searchTerm.toLowerCase());
      const methodsMatch = Object.values(methods).some((method: any) => 
        method.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        method.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return pathMatch || methodsMatch;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">API Documentation</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">GuardianX IPAM REST API Reference</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 rounded-full text-sm font-medium">
                v1.0.0
              </span>
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search endpoints, descriptions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        
        {spec ? (
          <div className="space-y-6">
            {/* Server & Auth Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Server Info */}
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-orange-500" />
                  Server Information
                </h2>
                <div className="space-y-2">
                  {spec.servers?.map((server: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div>
                        <p className="font-mono text-sm text-gray-900 dark:text-white">{server.url}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{server.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Authentication */}
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-orange-500" />
                  Authentication Methods
                </h2>
                <div className="space-y-2">
                  {spec.components?.securitySchemes && Object.entries(spec.components.securitySchemes).map(([key, scheme]: [string, any]) => (
                    <div key={key} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <h4 className="font-medium text-sm text-gray-900 dark:text-white">{scheme.description || key}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {scheme.type === 'http' ? `${scheme.scheme.toUpperCase()} ${scheme.bearerFormat || ''}` : 
                         scheme.type === 'apiKey' ? `Header: ${scheme.name}` : scheme.type}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Endpoints by Tag */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">API Endpoints</h2>
              
              {/* Quick Stats */}
              {spec.tags && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {spec.tags.slice(0, 8).map((tag: any) => {
                    const count = Object.entries(spec.paths || {}).filter(([path, methods]: [string, any]) =>
                      Object.values(methods).some((method: any) => method.tags?.includes(tag.name))
                    ).length;
                    return (
                      <div key={tag.name} className="bg-white dark:bg-gray-900 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-orange-500">{count}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{tag.name}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Endpoints grouped by tags */}
              {spec.tags && spec.tags.map((tag: any) => {
                const tagEndpoints = filterEndpoints(
                  Object.entries(spec.paths || {}).filter(([path, methods]: [string, any]) =>
                    Object.values(methods).some((method: any) => method.tags?.includes(tag.name))
                  )
                );

                if (tagEndpoints.length === 0) return null;
                const isExpanded = expandedTags.has(tag.name);

                return (
                  <div key={tag.name} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm overflow-hidden">
                    {/* Tag Header */}
                    <button
                      onClick={() => toggleTag(tag.name)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        <div className="text-left">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{tag.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{tag.description}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm font-medium">
                        {tagEndpoints.length} endpoints
                      </span>
                    </button>
                    
                    {/* Endpoints List */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 dark:border-gray-800">
                        {tagEndpoints.map(([path, methods]: [string, any]) =>
                          Object.entries(methods).map(([method, details]: [string, any]) => {
                            if (!details.tags?.includes(tag.name)) return null;
                            
                            const endpointKey = `${path}-${method}`;
                            const isEndpointExpanded = expandedEndpoints.has(endpointKey);
                            const isCopied = copiedEndpoint === endpointKey;

                            return (
                              <div key={endpointKey} className={`border-l-4 ${getMethodBorderColor(method)}`}>
                                {/* Endpoint Header */}
                                <button
                                  onClick={() => toggleEndpoint(endpointKey)}
                                  className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <span className={`px-3 py-1 text-xs font-semibold rounded ${getMethodColor(method)}`}>
                                        {method.toUpperCase()}
                                      </span>
                                      <code className="text-sm font-mono text-gray-700 dark:text-gray-300">{path}</code>
                                      {details.security && (
                                        <Lock className="w-4 h-4 text-orange-500" />
                                      )}
                                    </div>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        copyToClipboard(`${spec.servers?.[0]?.url || ''}${path}`, endpointKey);
                                      }}
                                      className="ml-2 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                                    >
                                      {isCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-gray-500" />}
                                    </button>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-left">{details.summary}</p>
                                </button>
                              
                                {/* Endpoint Details */}
                                {isEndpointExpanded && (
                                  <div className="px-4 pb-4 space-y-3">
                                    {/* Parameters */}
                                    {details.parameters && details.parameters.length > 0 && (
                                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                        <h5 className="font-semibold text-sm mb-3">Parameters</h5>
                                        <div className="space-y-2">
                                          {details.parameters.map((param: any, idx: number) => (
                                            <div key={idx} className="flex items-start gap-2">
                                              <code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                                                {param.name}
                                              </code>
                                              <div className="flex-1">
                                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                                  {param.description}
                                                </span>
                                                <div className="flex gap-2 mt-1">
                                                  <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-0.5 rounded">
                                                    {param.in}
                                                  </span>
                                                  {param.required && (
                                                    <span className="text-xs bg-red-100 dark:bg-red-900 px-2 py-0.5 rounded">
                                                      required
                                                    </span>
                                                  )}
                                                  {param.schema?.type && (
                                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                      {param.schema.type}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Request Body */}
                                    {details.requestBody && (
                                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                        <h5 className="font-semibold text-sm mb-3">Request Body</h5>
                                        <pre className="text-xs bg-gray-900 dark:bg-black text-gray-100 p-3 rounded overflow-x-auto">
                                          {JSON.stringify(
                                            details.requestBody.content?.['application/json']?.schema?.properties || 
                                            details.requestBody.content?.['application/json']?.schema || {},
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    )}

                                    {/* Responses */}
                                    {details.responses && (
                                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                                        <h5 className="font-semibold text-sm mb-3">Responses</h5>
                                        <div className="space-y-2">
                                          {Object.entries(details.responses).map(([code, response]: [string, any]) => (
                                            <div key={code} className="flex items-center gap-2">
                                              <span className={`text-xs font-semibold px-2 py-1 rounded ${
                                                code.startsWith('2') ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' :
                                                code.startsWith('4') ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                                code.startsWith('5') ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                                'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                              }`}>
                                                {code}
                                              </span>
                                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {response.description}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Info */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg p-6 mt-8">
              <h3 className="font-semibold text-lg mb-3">Quick Start Guide</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Using Bearer Token (JWT)</h4>
                  <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
{`curl -H "Authorization: Bearer YOUR_TOKEN" \\
     ${spec.servers?.[0]?.url || 'http://localhost:3000'}/api/endpoint`}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-2">Using API Key</h4>
                  <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700">
{`curl -H "X-API-Key: YOUR_API_KEY" \\
     ${spec.servers?.[0]?.url || 'http://localhost:3000'}/api/endpoint`}
                  </pre>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
                💡 <strong>Tip:</strong> Click on any endpoint to see detailed information including parameters, request body schema, and response codes.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading API documentation...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}