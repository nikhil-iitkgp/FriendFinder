'use client'

import React, { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Server,
  MessageSquare,
  Users
} from 'lucide-react'

interface HealthData {
  client: {
    connected: boolean
    state: any
    errorSummary: any
    queueStatus: any
  }
  server: {
    status: string
    socketServer?: {
      port: number
      path: string
      totalConnections: number
      activeConnections: number
      errorCount: number
      lastError: any
      uptime: number
    }
    timestamp: string
  }
}

export function SocketHealthMonitor() {
  const { connectionState, isConnected, connectionError, getHealthStatus, reconnect } = useSocket()
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const refreshHealthData = async () => {
    setLoading(true)
    try {
      const data = await getHealthStatus()
      setHealthData(data)
    } catch (error) {
      console.error('Failed to get health status:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refreshHealthData()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(refreshHealthData, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return 'bg-green-500'
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500'
      case 'disconnected':
      case 'failed':
        return 'bg-red-500'
      case 'fallback':
        return 'bg-orange-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return <CheckCircle className="h-4 w-4" />
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'disconnected':
      case 'failed':
        return <AlertCircle className="h-4 w-4" />
      case 'fallback':
        return <WifiOff className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Socket.IO Connection Health</CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Activity className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-pulse' : ''}`} />
              {autoRefresh ? 'Live' : 'Paused'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshHealthData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Client Status</h3>
                <Badge 
                  variant="secondary" 
                  className={`${getStatusColor(connectionState.status)} text-white`}
                >
                  <span className="flex items-center space-x-1">
                    {getStatusIcon(connectionState.status)}
                    <span className="capitalize">{connectionState.status}</span>
                  </span>
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Connected:</span>
                  <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                    {isConnected ? 'Yes' : 'No'}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span>Transport:</span>
                  <span className="capitalize">{connectionState.transport}</span>
                </div>
                
                {connectionState.fallbackActive && (
                  <div className="flex justify-between">
                    <span>Fallback Mode:</span>
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      <WifiOff className="h-3 w-3 mr-1" />
                      HTTP APIs Active
                    </Badge>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span>Retry Count:</span>
                  <span>{connectionState.retryCount}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Error Count:</span>
                  <span className={connectionState.errorCount > 0 ? 'text-red-600' : ''}>
                    {connectionState.errorCount}
                  </span>
                </div>
                
                {connectionState.lastConnected && (
                  <div className="flex justify-between">
                    <span>Last Connected:</span>
                    <span className="text-xs">
                      {new Date(connectionState.lastConnected).toLocaleTimeString()}
                    </span>
                  </div>
                )}
              </div>
              
              {connectionError && (
                <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {connectionError}
                </div>
              )}
              
              {!isConnected && (
                <Button 
                  size="sm" 
                  onClick={reconnect}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reconnect
                </Button>
              )}
            </div>

            {/* Server Status */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Server Status</h3>
                <Badge 
                  variant="secondary" 
                  className={`${getStatusColor(healthData?.server?.status || 'unknown')} text-white`}
                >
                  <span className="flex items-center space-x-1">
                    <Server className="h-4 w-4" />
                    <span className="capitalize">{healthData?.server?.status || 'Unknown'}</span>
                  </span>
                </Badge>
              </div>
              
              {healthData?.server?.socketServer && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Port:</span>
                    <span>{healthData.server.socketServer.port}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Active Connections:</span>
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {healthData.server.socketServer.activeConnections}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Total Connections:</span>
                    <span>{healthData.server.socketServer.totalConnections}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Uptime:</span>
                    <span>
                      <Clock className="h-3 w-3 inline mr-1" />
                      {formatUptime(healthData.server.socketServer.uptime)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Server Errors:</span>
                    <span className={healthData.server.socketServer.errorCount > 0 ? 'text-red-600' : ''}>
                      {healthData.server.socketServer.errorCount}
                    </span>
                  </div>
                  
                  {healthData.server.socketServer.lastError && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <AlertCircle className="h-3 w-3 inline mr-1" />
                      Last Error: {healthData.server.socketServer.lastError.error}
                      <br />
                      <span className="text-gray-500">
                        {new Date(healthData.server.socketServer.lastError.timestamp).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {!healthData?.server?.socketServer && healthData?.server?.status === 'unavailable' && (
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-700">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    Socket.IO server is not running. Use <code className="bg-yellow-200 px-1 rounded">npm run dev:full</code> to start both servers.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Queue Status */}
          {healthData?.client?.queueStatus && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Message Queue Status</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-yellow-600">
                      {healthData.client.queueStatus.pending}
                    </div>
                    <div className="text-xs text-gray-500">Pending</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">
                      {healthData.client.queueStatus.processing}
                    </div>
                    <div className="text-xs text-gray-500">Processing</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">
                      {healthData.client.queueStatus.failed}
                    </div>
                    <div className="text-xs text-gray-500">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">
                      {healthData.client.queueStatus.totalProcessed}
                    </div>
                    <div className="text-xs text-gray-500">Processed</div>
                  </div>
                </div>
                {healthData.client.queueStatus.lastSync && (
                  <div className="text-xs text-gray-500 text-center">
                    Last sync: {new Date(healthData.client.queueStatus.lastSync).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Error Summary */}
          {healthData?.client?.errorSummary && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Error Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Total Errors: {healthData.client.errorSummary.totalErrors}</div>
                    <div className="font-medium">Critical (Last Hour): {healthData.client.errorSummary.criticalErrorsLastHour}</div>
                  </div>
                  <div>
                    {Object.entries(healthData.client.errorSummary.errorCounts).map(([type, count]) => (
                      <div key={type} className="flex justify-between">
                        <span className="capitalize">{type}:</span>
                        <span>{count as number}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}