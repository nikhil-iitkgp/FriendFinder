'use client'

import { useState, useEffect } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Wifi,
  WifiOff,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface HealthStatus {
  client: {
    connected: boolean
    state: any
    errorSummary: any
    queueStatus: any
  }
  server: {
    status: string
    error?: string
  }
}

export function ConnectionStatusDashboard() {
  const { 
    isConnected, 
    connectionState, 
    connectionError, 
    reconnect, 
    getHealthStatus 
  } = useSocket()
  
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchHealthStatus = async () => {
    setIsLoading(true)
    try {
      const status = await getHealthStatus()
      setHealthStatus(status)
    } catch (error) {
      console.error('Failed to fetch health status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthStatus()
    const interval = setInterval(fetchHealthStatus, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [getHealthStatus])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-100 text-yellow-800'
      case 'fallback':
        return 'bg-orange-100 text-orange-800'
      case 'failed':
      case 'disconnected':
      case 'unavailable':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'healthy':
        return <CheckCircle className=\"w-4 h-4\" />
      case 'connecting':
      case 'reconnecting':
        return <RefreshCw className=\"w-4 h-4 animate-spin\" />
      case 'fallback':
        return <AlertTriangle className=\"w-4 h-4\" />
      case 'failed':
      case 'disconnected':
      case 'unavailable':
        return <XCircle className=\"w-4 h-4\" />
      default:
        return <Activity className=\"w-4 h-4\" />
    }
  }

  return (
    <Card className=\"w-full max-w-2xl\">
      <CardHeader className=\"pb-3\">
        <div className=\"flex items-center justify-between\">
          <CardTitle className=\"flex items-center gap-2\">
            {isConnected ? (
              <Wifi className=\"w-5 h-5 text-green-600\" />
            ) : (
              <WifiOff className=\"w-5 h-5 text-red-600\" />
            )}
            Connection Status
          </CardTitle>
          <Button
            variant=\"outline\"
            size=\"sm\"
            onClick={fetchHealthStatus}
            disabled={isLoading}
            className=\"h-8\"
          >
            <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className=\"space-y-4\">
        {/* Real-time Connection Status */}
        <div className=\"space-y-2\">
          <h4 className=\"text-sm font-medium text-gray-700\">Real-time Connection</h4>
          <div className=\"flex items-center justify-between p-3 bg-gray-50 rounded-lg\">
            <div className=\"flex items-center gap-2\">
              {getStatusIcon(connectionState.status)}
              <span className=\"text-sm font-medium\">
                {connectionState.status.charAt(0).toUpperCase() + connectionState.status.slice(1)}
              </span>
            </div>
            <Badge className={getStatusColor(connectionState.status)}>
              {connectionState.transport}
            </Badge>
          </div>
          
          {connectionError && (
            <div className=\"p-3 bg-red-50 border border-red-200 rounded-lg\">
              <p className=\"text-sm text-red-700\">{connectionError}</p>
            </div>
          )}
        </div>

        {/* Connection Details */}
        <div className=\"grid grid-cols-2 gap-4 text-sm\">
          <div>
            <span className=\"text-gray-500\">Retry Count:</span>
            <span className=\"ml-2 font-medium\">{connectionState.retryCount}</span>
          </div>
          <div>
            <span className=\"text-gray-500\">Error Count:</span>
            <span className=\"ml-2 font-medium\">{connectionState.errorCount}</span>
          </div>
          <div>
            <span className=\"text-gray-500\">Fallback Active:</span>
            <span className=\"ml-2 font-medium\">
              {connectionState.fallbackActive ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className=\"text-gray-500\">Last Connected:</span>
            <span className=\"ml-2 font-medium\">
              {connectionState.lastConnected 
                ? new Date(connectionState.lastConnected).toLocaleTimeString()
                : 'Never'
              }
            </span>
          </div>
        </div>

        {/* Server Health Status */}
        {healthStatus && (
          <div className=\"space-y-2\">
            <h4 className=\"text-sm font-medium text-gray-700\">Server Health</h4>
            <div className=\"flex items-center justify-between p-3 bg-gray-50 rounded-lg\">
              <div className=\"flex items-center gap-2\">
                {getStatusIcon(healthStatus.server.status)}
                <span className=\"text-sm font-medium\">
                  Socket.IO Server
                </span>
              </div>
              <Badge className={getStatusColor(healthStatus.server.status)}>
                {healthStatus.server.status}
              </Badge>
            </div>
            
            {healthStatus.server.error && (
              <div className=\"p-3 bg-red-50 border border-red-200 rounded-lg\">
                <p className=\"text-sm text-red-700\">{healthStatus.server.error}</p>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className=\"flex gap-2 pt-2\">
          <Button
            variant=\"outline\"
            size=\"sm\"
            onClick={reconnect}
            disabled={isConnected}
            className=\"flex-1\"
          >
            <RefreshCw className=\"w-3 h-3 mr-1\" />
            Reconnect
          </Button>
          
          {connectionState.fallbackActive && (
            <Button
              variant=\"outline\"
              size=\"sm\"
              className=\"flex-1 border-orange-200 text-orange-700 hover:bg-orange-50\"
              disabled
            >
              <AlertTriangle className=\"w-3 h-3 mr-1\" />
              Fallback Mode
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}"