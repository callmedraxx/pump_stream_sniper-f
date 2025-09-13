// "use client"

// import { useState, useEffect } from "react"
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Badge } from "@/components/ui/badge"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// // import { ScrollArea } from "@/components/ui/scroll-area"

// // Simple ScrollArea fallback
// const ScrollArea = ({ children, className }: { children: React.ReactNode; className?: string }) => (
//   <div className={`overflow-auto ${className || ''}`}>
//     {children}
//   </div>
// )
// import { RefreshCw, Activity, Database, AlertTriangle, CheckCircle } from "lucide-react"

// interface TokenDebugData {
//   timestamp: string
//   tokenCount: number
//   sampleTokens: any[]
//   volumeStats: {
//     tokensWithVolume: number
//     tokensWithZeroVolume: number
//     maxVolume: number
//     avgVolume: number
//   }
//   tradersStats: {
//     tokensWithTraders: number
//     tokensWithZeroTraders: number
//     maxTraders: number
//     avgTraders: number
//   }
//   rawSample: any
// }

// interface TokenDebugPanelProps {
//   tokens: any[]
//   isConnected: boolean
//   lastUpdate: string
// }

// export function TokenDebugPanel({ tokens, isConnected, lastUpdate }: TokenDebugPanelProps) {
//   const [debugData, setDebugData] = useState<TokenDebugData | null>(null)
//   const [isVisible, setIsVisible] = useState(false)
//   const [selectedPeriod, setSelectedPeriod] = useState<'5m' | '1h' | '6h' | '24h'>('24h')
//   const [backendTest, setBackendTest] = useState<any>(null)
//   const [isTestingBackend, setIsTestingBackend] = useState(false)
//   const [httpTokensTest, setHttpTokensTest] = useState<any>(null)
//   const [isTestingHttpTokens, setIsTestingHttpTokens] = useState(false)

//   useEffect(() => {
//     if (tokens.length > 0) {
//       analyzeTokens()
//     }
//   }, [tokens, selectedPeriod])

//   const analyzeTokens = () => {
//     const sampleSize = Math.min(10, tokens.length)
//     const sampleTokens = tokens.slice(0, sampleSize)
    
//     // Analyze volume data
//     const volumeValues = tokens.map(token => {
//       const volume = token.trading_info?.[`volume_${selectedPeriod}`] || 
//                     token.volume?.[selectedPeriod] || 
//                     0
//       return typeof volume === 'number' ? volume : parseFloat(volume) || 0
//     })
    
//     // Analyze traders data
//     const tradersValues = tokens.map(token => {
//       const traders = token.trading_info?.[`traders_${selectedPeriod}`] || 
//                      token.traders?.[selectedPeriod] || 
//                      0
//       return typeof traders === 'number' ? traders : parseFloat(traders) || 0
//     })

//     const volumeStats = {
//       tokensWithVolume: volumeValues.filter(v => v > 0).length,
//       tokensWithZeroVolume: volumeValues.filter(v => v === 0).length,
//       maxVolume: Math.max(...volumeValues),
//       avgVolume: volumeValues.reduce((a, b) => a + b, 0) / volumeValues.length
//     }

//     const tradersStats = {
//       tokensWithTraders: tradersValues.filter(t => t > 0).length,
//       tokensWithZeroTraders: tradersValues.filter(t => t === 0).length,
//       maxTraders: Math.max(...tradersValues),
//       avgTraders: tradersValues.reduce((a, b) => a + b, 0) / tradersValues.length
//     }

//     setDebugData({
//       timestamp: new Date().toLocaleString(),
//       tokenCount: tokens.length,
//       sampleTokens: sampleTokens.map(token => ({
//         mint: token.token_info?.mint || token.mint_address || 'Unknown',
//         name: token.token_info?.name || token.name || 'Unknown',
//         symbol: token.token_info?.symbol || token.symbol || 'Unknown',
//         volume: token.trading_info?.[`volume_${selectedPeriod}`] || token.volume?.[selectedPeriod] || 0,
//         traders: token.trading_info?.[`traders_${selectedPeriod}`] || token.traders?.[selectedPeriod] || 0,
//         mcap: token.market_data?.market_cap || token.mcap || '0',
//         rawVolume: token.volume,
//         rawTraders: token.traders,
//         rawTradingInfo: token.trading_info
//       })),
//       volumeStats,
//       tradersStats,
//       rawSample: tokens[0] || null
//     })
//   }

//   const formatNumber = (num: number) => {
//     if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`
//     if (num >= 1000) return `${(num / 1000).toFixed(2)}K`
//     return num.toLocaleString()
//   }

//   const testBackendConnection = async () => {
//     setIsTestingBackend(true)
//     try {
//       const response = await fetch('/api/debug-backend')
//       const result = await response.json()
//       setBackendTest(result)
//     } catch (error) {
//       setBackendTest({ 
//         success: false, 
//         error: error instanceof Error ? error.message : 'Unknown error' 
//       })
//     } finally {
//       setIsTestingBackend(false)
//     }
//   }

//   const testHttpTokensEndpoint = async () => {
//     setIsTestingHttpTokens(true)
//     try {
//       const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
//       const response = await fetch(`${backendUrl}/tokens`)
      
//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`)
//       }
      
//       const data = await response.json()
      
//       // Analyze the HTTP response structure
//       const analysis = {
//         endpoint: `${backendUrl}/tokens`,
//         responseStatus: response.status,
//         dataType: Array.isArray(data) ? 'array' : typeof data,
//         tokenCount: Array.isArray(data) ? data.length : (data.tokens ? data.tokens.length : 0),
//         sampleTokens: [],
//         volumeAnalysis: {
//           tokensWithVolumeData: 0,
//           tokensWithTradersData: 0,
//           tokensWithZeroVolume: 0,
//           tokensWithZeroTraders: 0,
//           rawVolumeStructures: []
//         }
//       }
      
//       // Get the tokens array
//       let tokensArray = Array.isArray(data) ? data : data.tokens || []
      
//       // Analyze first 5 tokens
//       const sampleTokens = tokensArray.slice(0, Math.min(5, tokensArray.length))
      
//       sampleTokens.forEach((token: any, index: number) => {
//         // Check volume and traders data
//         const hasVolumeObject = token.volume && typeof token.volume === 'object'
//         const hasTradersObject = token.traders && typeof token.traders === 'object'
        
//         if (hasVolumeObject) analysis.volumeAnalysis.tokensWithVolumeData++
//         if (hasTradersObject) analysis.volumeAnalysis.tokensWithTradersData++
        
//         // Check specific time period values
//         const volume24h = token.volume?.['24h'] || 0
//         const traders24h = token.traders?.['24h'] || 0
//         const volume5m = token.volume?.['5m'] || 0
//         const traders5m = token.traders?.['5m'] || 0
        
//         if (volume24h === 0 || volume24h === '0') analysis.volumeAnalysis.tokensWithZeroVolume++
//         if (traders24h === 0 || traders24h === '0') analysis.volumeAnalysis.tokensWithZeroTraders++
        
//         // Store detailed sample
//         analysis.sampleTokens.push({
//           index,
//           mint: token.mint_address || token.mint || 'Unknown',
//           name: token.name || 'Unknown',
//           symbol: token.symbol || 'Unknown',
//           mcap: token.mcap || '0',
//           volume: {
//             '5m': volume5m,
//             '1h': token.volume?.['1h'] || 0,
//             '6h': token.volume?.['6h'] || 0,
//             '24h': volume24h,
//             fullObject: token.volume
//           },
//           traders: {
//             '5m': traders5m,
//             '1h': token.traders?.['1h'] || 0,
//             '6h': token.traders?.['6h'] || 0,
//             '24h': traders24h,
//             fullObject: token.traders
//           },
//           hasVolumeObject,
//           hasTradersObject,
//           // Show what our frontend parsing logic would extract
//           frontendWouldExtract: {
//             volume24h: token.volume?.['24h'] || token.trading_info?.volume_24h || 0,
//             traders24h: token.traders?.['24h'] || token.trading_info?.traders_24h || 0,
//             volume5m: token.volume?.['5m'] || token.trading_info?.volume_5m || 0,
//             traders5m: token.traders?.['5m'] || token.trading_info?.traders_5m || 0
//           }
//         })
//       })
      
//       setHttpTokensTest({
//         success: true,
//         timestamp: new Date().toISOString(),
//         analysis
//       })
      
//     } catch (error) {
//       setHttpTokensTest({
//         success: false,
//         error: error instanceof Error ? error.message : 'Unknown error',
//         timestamp: new Date().toISOString()
//       })
//     } finally {
//       setIsTestingHttpTokens(false)
//     }
//   }

//   if (!isVisible) {
//     return (
//       <div className="fixed bottom-4 right-4 z-50">
//         <Button
//           onClick={() => setIsVisible(true)}
//           variant="outline"
//           size="sm"
//           className="bg-background shadow-lg"
//         >
//           <Activity className="h-4 w-4 mr-2" />
//           Debug Panel
//         </Button>
//       </div>
//     )
//   }

//   return (
//     <div className="fixed bottom-4 right-4 w-96 max-h-96 z-50">
//       <Card className="bg-background shadow-xl border-2">
//         <CardHeader className="pb-2">
//           <div className="flex items-center justify-between">
//             <CardTitle className="text-sm flex items-center gap-2">
//               <Database className="h-4 w-4" />
//               Token Data Debug
//             </CardTitle>
//             <div className="flex items-center gap-2">
//               <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
//                 {isConnected ? (
//                   <>
//                     <CheckCircle className="h-3 w-3 mr-1" />
//                     Connected
//                   </>
//                 ) : (
//                   <>
//                     <AlertTriangle className="h-3 w-3 mr-1" />
//                     Disconnected
//                   </>
//                 )}
//               </Badge>
//               <Button
//                 onClick={() => setIsVisible(false)}
//                 variant="ghost"
//                 size="sm"
//                 className="h-6 w-6 p-0"
//               >
//                 ×
//               </Button>
//             </div>
//           </div>
//         </CardHeader>
        
//         <CardContent className="p-4 pt-0">
//           <ScrollArea className="h-80">
//             <div className="space-y-4">
//               {/* Connection Status */}
//               <div className="space-y-2">
//                 <h4 className="text-xs font-medium">Connection Status</h4>
//                 <div className="text-xs space-y-1">
//                   <div>Last Update: {lastUpdate || 'Never'}</div>
//                   <div>Total Tokens: {debugData?.tokenCount || 0}</div>
//                 </div>
//               </div>

//               {/* Time Period Selector */}
//               <div className="space-y-2">
//                 <h4 className="text-xs font-medium">Time Period</h4>
//                 <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
//                   <TabsList className="grid w-full grid-cols-4">
//                     <TabsTrigger value="5m" className="text-xs">5m</TabsTrigger>
//                     <TabsTrigger value="1h" className="text-xs">1h</TabsTrigger>
//                     <TabsTrigger value="6h" className="text-xs">6h</TabsTrigger>
//                     <TabsTrigger value="24h" className="text-xs">24h</TabsTrigger>
//                   </TabsList>
//                 </Tabs>
//               </div>

//               {debugData && (
//                 <>
//                   {/* Volume Analysis */}
//                   <div className="space-y-2">
//                     <h4 className="text-xs font-medium flex items-center gap-2">
//                       Volume Analysis ({selectedPeriod})
//                       {debugData.volumeStats.tokensWithZeroVolume > debugData.volumeStats.tokensWithVolume && (
//                         <AlertTriangle className="h-3 w-3 text-amber-500" />
//                       )}
//                     </h4>
//                     <div className="grid grid-cols-2 gap-2 text-xs">
//                       <div className="bg-green-50 dark:bg-green-950 p-2 rounded">
//                         <div className="text-green-700 dark:text-green-300 font-medium">
//                           With Volume: {debugData.volumeStats.tokensWithVolume}
//                         </div>
//                         <div className="text-green-600 dark:text-green-400">
//                           Max: {formatNumber(debugData.volumeStats.maxVolume)}
//                         </div>
//                         <div className="text-green-600 dark:text-green-400">
//                           Avg: {formatNumber(debugData.volumeStats.avgVolume)}
//                         </div>
//                       </div>
//                       <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
//                         <div className="text-red-700 dark:text-red-300 font-medium">
//                           Zero Volume: {debugData.volumeStats.tokensWithZeroVolume}
//                         </div>
//                         <div className="text-red-600 dark:text-red-400">
//                           {((debugData.volumeStats.tokensWithZeroVolume / debugData.tokenCount) * 100).toFixed(1)}% of total
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Traders Analysis */}
//                   <div className="space-y-2">
//                     <h4 className="text-xs font-medium flex items-center gap-2">
//                       Traders Analysis ({selectedPeriod})
//                       {debugData.tradersStats.tokensWithZeroTraders > debugData.tradersStats.tokensWithTraders && (
//                         <AlertTriangle className="h-3 w-3 text-amber-500" />
//                       )}
//                     </h4>
//                     <div className="grid grid-cols-2 gap-2 text-xs">
//                       <div className="bg-blue-50 dark:bg-blue-950 p-2 rounded">
//                         <div className="text-blue-700 dark:text-blue-300 font-medium">
//                           With Traders: {debugData.tradersStats.tokensWithTraders}
//                         </div>
//                         <div className="text-blue-600 dark:text-blue-400">
//                           Max: {formatNumber(debugData.tradersStats.maxTraders)}
//                         </div>
//                         <div className="text-blue-600 dark:text-blue-400">
//                           Avg: {formatNumber(debugData.tradersStats.avgTraders)}
//                         </div>
//                       </div>
//                       <div className="bg-red-50 dark:bg-red-950 p-2 rounded">
//                         <div className="text-red-700 dark:text-red-300 font-medium">
//                           Zero Traders: {debugData.tradersStats.tokensWithZeroTraders}
//                         </div>
//                         <div className="text-red-600 dark:text-red-400">
//                           {((debugData.tradersStats.tokensWithZeroTraders / debugData.tokenCount) * 100).toFixed(1)}% of total
//                         </div>
//                       </div>
//                     </div>
//                   </div>

//                   {/* Sample Tokens */}
//                   <div className="space-y-2">
//                     <h4 className="text-xs font-medium">Sample Tokens</h4>
//                     <div className="space-y-2 max-h-32 overflow-y-auto">
//                       {debugData.sampleTokens.map((token, i) => (
//                         <div key={i} className="bg-muted p-2 rounded text-xs">
//                           <div className="font-medium truncate">{token.name} (${token.symbol})</div>
//                           <div className="grid grid-cols-2 gap-2 mt-1">
//                             <div>
//                               <span className="text-muted-foreground">Vol:</span> {formatNumber(token.volume)}
//                             </div>
//                             <div>
//                               <span className="text-muted-foreground">Traders:</span> {formatNumber(token.traders)}
//                             </div>
//                           </div>
//                           <div className="truncate text-muted-foreground mt-1">
//                             {token.mint.slice(0, 8)}...{token.mint.slice(-4)}
//                           </div>
//                         </div>
//                       ))}
//                     </div>
//                   </div>

//                   {/* Raw Data Sample */}
//                   <div className="space-y-2">
//                     <h4 className="text-xs font-medium">Raw Backend Structure</h4>
//                     <div className="bg-muted p-2 rounded text-xs max-h-32 overflow-auto">
//                       <pre className="whitespace-pre-wrap text-[10px]">
//                         {debugData.rawSample && JSON.stringify({
//                           volume: debugData.rawSample.volume,
//                           traders: debugData.rawSample.traders,
//                           txns: debugData.rawSample.txns,
//                           price_changes: debugData.rawSample.price_changes,
//                           trading_info: debugData.rawSample.trading_info ? {
//                             [`volume_${selectedPeriod}`]: debugData.rawSample.trading_info[`volume_${selectedPeriod}`],
//                             [`traders_${selectedPeriod}`]: debugData.rawSample.trading_info[`traders_${selectedPeriod}`],
//                             [`txns_${selectedPeriod}`]: debugData.rawSample.trading_info[`txns_${selectedPeriod}`]
//                           } : null,
//                           // Show what the backend actually sent
//                           backendStructure: {
//                             hasVolume: !!debugData.rawSample.volume,
//                             hasTraders: !!debugData.rawSample.traders,
//                             hasTxns: !!debugData.rawSample.txns,
//                             hasPriceChanges: !!debugData.rawSample.price_changes,
//                             hasTradingInfo: !!debugData.rawSample.trading_info
//                           }
//                         }, null, 2)}
//                       </pre>
//                     </div>
//                   </div>

//                   {/* Data Path Analysis */}
//                   <div className="space-y-2">
//                     <h4 className="text-xs font-medium">Data Path Analysis</h4>
//                     <div className="text-xs space-y-1">
//                       {debugData.rawSample && (
//                         <>
//                           <div className="flex items-center justify-between">
//                             <span>Backend sends volume object:</span>
//                             <Badge variant={debugData.rawSample.volume ? "default" : "destructive"} className="text-xs">
//                               {debugData.rawSample.volume ? "✓" : "✗"}
//                             </Badge>
//                           </div>
//                           <div className="flex items-center justify-between">
//                             <span>Backend sends traders object:</span>
//                             <Badge variant={debugData.rawSample.traders ? "default" : "destructive"} className="text-xs">
//                               {debugData.rawSample.traders ? "✓" : "✗"}
//                             </Badge>
//                           </div>
//                           <div className="flex items-center justify-between">
//                             <span>Frontend finds volume data:</span>
//                             <Badge variant={debugData.volumeStats.tokensWithVolume > 0 ? "default" : "destructive"} className="text-xs">
//                               {debugData.volumeStats.tokensWithVolume > 0 ? "✓" : "✗"}
//                             </Badge>
//                           </div>
//                           <div className="flex items-center justify-between">
//                             <span>Frontend finds trader data:</span>
//                             <Badge variant={debugData.tradersStats.tokensWithTraders > 0 ? "default" : "destructive"} className="text-xs">
//                               {debugData.tradersStats.tokensWithTraders > 0 ? "✓" : "✗"}
//                             </Badge>
//                           </div>
//                         </>
//                       )}
//                     </div>
//                   </div>
//                 </>
//               )}

//               <div className="grid grid-cols-1 gap-2">
//                 <Button
//                   onClick={analyzeTokens}
//                   variant="outline"
//                   size="sm"
//                   className="w-full"
//                 >
//                   <RefreshCw className="h-3 w-3 mr-2" />
//                   Refresh Analysis
//                 </Button>
                
//                 <Button
//                   onClick={testBackendConnection}
//                   variant="outline"
//                   size="sm"
//                   className="w-full"
//                   disabled={isTestingBackend}
//                 >
//                   <Database className="h-3 w-3 mr-2" />
//                   {isTestingBackend ? 'Testing...' : 'Test Backend'}
//                 </Button>
                
//                 <Button
//                   onClick={testHttpTokensEndpoint}
//                   variant="outline"
//                   size="sm"
//                   className="w-full"
//                   disabled={isTestingHttpTokens}
//                 >
//                   <Activity className="h-3 w-3 mr-2" />
//                   {isTestingHttpTokens ? 'Testing...' : 'Test HTTP /tokens'}
//                 </Button>
//               </div>

//               {/* Backend Test Results */}
//               {backendTest && (
//                 <div className="space-y-2">
//                   <h4 className="text-xs font-medium flex items-center gap-2">
//                     Backend Test Results
//                     <Badge variant={backendTest.success ? "default" : "destructive"} className="text-xs">
//                       {backendTest.success ? "Success" : "Failed"}
//                     </Badge>
//                   </h4>
                  
//                   {backendTest.success ? (
//                     <div className="bg-muted p-2 rounded text-xs space-y-2">
//                       <div>
//                         <strong>Backend URL:</strong> {backendTest.analysis?.backendUrl}
//                       </div>
//                       <div>
//                         <strong>Response Status:</strong> {backendTest.analysis?.responseStatus}
//                       </div>
//                       <div>
//                         <strong>Token Count:</strong> {backendTest.analysis?.dataStructure?.length || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Volume Object:</strong> {backendTest.analysis?.volumeAnalysis?.tokensWithVolumeObject || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Traders Object:</strong> {backendTest.analysis?.volumeAnalysis?.tokensWithTradersObject || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Zero Volume 24h:</strong> {backendTest.analysis?.volumeAnalysis?.tokensWithZeroVolume24h || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Zero Traders 24h:</strong> {backendTest.analysis?.volumeAnalysis?.tokensWithZeroTraders24h || 0}
//                       </div>
                      
//                       {backendTest.analysis?.volumeAnalysis?.sampleVolumeStructures?.[0] && (
//                         <details className="mt-2">
//                           <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Sample Token Structure</summary>
//                           <pre className="mt-1 text-[10px] bg-background p-2 rounded border overflow-auto max-h-32">
// {JSON.stringify(backendTest.analysis.volumeAnalysis.sampleVolumeStructures[0], null, 2)}
//                           </pre>
//                         </details>
//                       )}
//                     </div>
//                   ) : (
//                     <div className="bg-red-50 dark:bg-red-950 p-2 rounded text-xs">
//                       <strong>Error:</strong> {backendTest.error}
//                     </div>
//                   )}
//                 </div>
//               )}

//               {/* HTTP Tokens Test Results */}
//               {httpTokensTest && (
//                 <div className="space-y-2">
//                   <h4 className="text-xs font-medium flex items-center gap-2">
//                     HTTP /tokens Test Results
//                     <Badge variant={httpTokensTest.success ? "default" : "destructive"} className="text-xs">
//                       {httpTokensTest.success ? "Success" : "Failed"}
//                     </Badge>
//                   </h4>
                  
//                   {httpTokensTest.success ? (
//                     <div className="bg-muted p-2 rounded text-xs space-y-2">
//                       <div>
//                         <strong>Endpoint:</strong> {httpTokensTest.analysis?.endpoint}
//                       </div>
//                       <div>
//                         <strong>Token Count:</strong> {httpTokensTest.analysis?.tokenCount || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Volume Data:</strong> {httpTokensTest.analysis?.volumeAnalysis?.tokensWithVolumeData || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Traders Data:</strong> {httpTokensTest.analysis?.volumeAnalysis?.tokensWithTradersData || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Zero Volume 24h:</strong> {httpTokensTest.analysis?.volumeAnalysis?.tokensWithZeroVolume || 0}
//                       </div>
//                       <div>
//                         <strong>Tokens with Zero Traders 24h:</strong> {httpTokensTest.analysis?.volumeAnalysis?.tokensWithZeroTraders || 0}
//                       </div>
                      
//                       {httpTokensTest.analysis?.sampleTokens?.[0] && (
//                         <details className="mt-2">
//                           <summary className="cursor-pointer text-blue-600 hover:text-blue-800">Sample Token Data</summary>
//                           <div className="mt-1 text-[10px] space-y-2">
//                             {httpTokensTest.analysis.sampleTokens.slice(0, 2).map((token: any, i: number) => (
//                               <div key={i} className="bg-background p-2 rounded border">
//                                 <div><strong>{token.name} (${token.symbol})</strong></div>
//                                 <div>Mint: {token.mint.slice(0, 8)}...</div>
//                                 <div className="grid grid-cols-2 gap-2 mt-1">
//                                   <div>
//                                     <div className="text-green-600">Volume Object:</div>
//                                     <div>5m: {token.volume['5m']}</div>
//                                     <div>1h: {token.volume['1h']}</div>
//                                     <div>24h: {token.volume['24h']}</div>
//                                   </div>
//                                   <div>
//                                     <div className="text-blue-600">Traders Object:</div>
//                                     <div>5m: {token.traders['5m']}</div>
//                                     <div>1h: {token.traders['1h']}</div>
//                                     <div>24h: {token.traders['24h']}</div>
//                                   </div>
//                                 </div>
//                                 <div className="mt-2 border-t pt-1">
//                                   <div className="text-purple-600">Frontend Would Extract:</div>
//                                   <div>Vol 24h: {token.frontendWouldExtract.volume24h}</div>
//                                   <div>Traders 24h: {token.frontendWouldExtract.traders24h}</div>
//                                 </div>
//                               </div>
//                             ))}
//                           </div>
//                         </details>
//                       )}
                      
//                       {httpTokensTest.analysis?.sampleTokens?.length > 0 && (
//                         <details className="mt-2">
//                           <summary className="cursor-pointer text-purple-600 hover:text-purple-800">Raw Volume Structure</summary>
//                           <pre className="mt-1 text-[10px] bg-background p-2 rounded border overflow-auto max-h-32">
// {JSON.stringify(httpTokensTest.analysis.sampleTokens[0].volume.fullObject, null, 2)}
//                           </pre>
//                         </details>
//                       )}
//                     </div>
//                   ) : (
//                     <div className="bg-red-50 dark:bg-red-950 p-2 rounded text-xs">
//                       <strong>Error:</strong> {httpTokensTest.error}
//                     </div>
//                   )}
//                 </div>
//               )}
//             </div>
//           </ScrollArea>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }
