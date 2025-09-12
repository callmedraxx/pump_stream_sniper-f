import { NextRequest, NextResponse } from 'next/server';
import { tokenStorage } from '@/lib/token-storage';

export async function GET(request: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const sseUrl = `${backendUrl}/tokens/stream`;
  const DEBUG_JSON = process.env.DEBUG_JSON === 'true';

  if (DEBUG_JSON) {
    //console.log('🔍 DEBUG_JSON mode enabled - detailed JSON processing logs will be shown');
  }

  //console.log('Connecting to backend SSE:', sseUrl);
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  // Handle status check
  if (action === 'status') {
    try {
      const stats = tokenStorage.getStats();
      const tokensData = tokenStorage.getTokens();

      return NextResponse.json({
        status: 'success',
        has_data: stats.hasData,
        token_count: stats.tokenCount,
        last_updated: stats.lastUpdate,
        data_size: tokensData?.data?.length || 0,
        storage_type: 'in-memory'
      });
    } catch (error) {
      return NextResponse.json({
        status: 'error',
        has_data: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle test data injection
  if (action === 'test') {
    try {

      const testTokens = [
        {
          token_info: {
            mint: 'TEST1234567890123456789012345678901234567890',
            name: 'Test Token 1',
            symbol: 'TEST1'
          },
          market_data: {
            market_cap: 50000,
            usd_market_cap: 50000,
            progress_percentage: 75.5
          },
          creator_info: {
            creator: 'TestCreator123',
            created_formatted: '2025-01-15 10:30:00'
          },
          social_links: {
            twitter: 'https://twitter.com/testtoken1'
          },
          status_flags: {
            is_currently_live: true,
            nsfw: false,
            show_name: true
          },
          trading_info: {
            last_trade_formatted: '2 mins ago'
          },
          pool_info: {
            reply_count: 25
          },
          activity_info: {},
          raw_data: {}
        }
      ];

      const testData = {
        event: 'live_tokens_update',
        timestamp: new Date().toISOString(),
        token_count: testTokens.length,
        data: testTokens,
        last_sse_update: new Date().toISOString(),
        backend_total_count: testTokens.length
      };

      tokenStorage.setTokens(testData);

      return NextResponse.json({
        status: 'success',
        message: 'Test data injected successfully',
        token_count: testTokens.length
      });
    } catch (error) {
      return NextResponse.json({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle direct data access
  if (action === 'file') {
    try {
      const tokensData = tokenStorage.getTokens();
      
      if (!tokensData) {
        return NextResponse.json(
          { error: 'No tokens data available' }, 
          { status: 404 }
        );
      }

      return new NextResponse(JSON.stringify(tokensData), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (error) {
      return NextResponse.json(
        { error: 'Tokens file not found', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 404 }
      );
    }
  }

  try {
    // No file system operations needed - using in-memory storage

    // Transform backend token format to LiveToken format
    const transformBackendToken = (backendToken: any) => {
      const volume24h = backendToken.volume?.['24h'] || 0;
      const txns24h = backendToken.txns?.['24h'] || 0;
      const traders24h = backendToken.traders?.['24h'] || 0;
      const priceChange24h = backendToken.price_changes?.['24h'] || 0;

      return {
        token_info: {
          mint: backendToken.mint_address,
          name: backendToken.name,
          symbol: backendToken.symbol,
          description: null,
          image_uri: backendToken.image_url,
          metadata_uri: null,
          video_uri: null
        },
        market_data: {
          market_cap: backendToken.mcap,
          usd_market_cap: backendToken.mcap,
          progress_percentage: backendToken.progress || 0,
          last_trade_formatted: null,
          ath: backendToken.ath || null
        },
        creator_info: {
          creator: backendToken.creator,
          created_formatted: backendToken.age
        },
        social_links: {
          twitter: backendToken.social_links?.twitter || null
        },
        status_flags: {
          is_currently_live: backendToken.is_live,
          nsfw: backendToken.nsfw || false,
          show_name: true,
          is_active: backendToken.is_active || false
        },
        trading_info: {
          virtual_sol_reserves: backendToken.pool_info?.virtual_sol_reserves || 0,
          real_sol_reserves: backendToken.pool_info?.real_sol_reserves || 0,
          total_sol: (backendToken.pool_info?.virtual_sol_reserves || 0) + (backendToken.pool_info?.real_sol_reserves || 0),
          progress_percentage: backendToken.progress || 0,
          last_trade_timestamp: backendToken.activity?.last_trade_timestamp || null,
          last_trade_formatted: null,
          market_cap: backendToken.mcap,
          usd_market_cap: backendToken.mcap,
          volume_24h: volume24h,
          txns_24h: txns24h,
          traders_24h: traders24h,
          price_change_24h: priceChange24h,
          volume_5m: backendToken.volume?.['5m'] || 0,
          volume_1h: backendToken.volume?.['1h'] || 0,
          volume_6h: backendToken.volume?.['6h'] || 0,
          txns_5m: backendToken.txns?.['5m'] || 0,
          txns_1h: backendToken.txns?.['1h'] || 0,
          txns_6h: backendToken.txns?.['6h'] || 0,
          traders_5m: backendToken.traders?.['5m'] || 0,
          traders_1h: backendToken.traders?.['1h'] || 0,
          traders_6h: backendToken.traders?.['6h'] || 0,
          price_change_5m: backendToken.price_changes?.['5m'] || 0,
          price_change_1h: backendToken.price_changes?.['1h'] || 0,
          price_change_6h: backendToken.price_changes?.['6h'] || 0
        },
        pool_info: {
          complete: backendToken.pool_info?.complete || false,
          is_currently_live: backendToken.is_live,
          king_of_hill_timestamp: null,
          last_reply: backendToken.activity?.last_reply || null,
          reply_count: backendToken.activity?.reply_count || backendToken.viewers || 0,
          raydium_pool: backendToken.pool_info?.raydium_pool || null,
          curve_threshold: null
        },
        activity_info: {
          created_timestamp: backendToken.timestamps?.created_at ? new Date(backendToken.timestamps.created_at).getTime() / 1000 : null,
          created_formatted: backendToken.age,
          nsfw: backendToken.nsfw || false,
          show_name: true,
          creator: backendToken.creator,
          dev_buy: backendToken.holders?.creator_holding_percentage || null,
          dev_sell: null,
          sniping: backendToken.holders?.creator_is_top_holder || null,
          last_updated: backendToken.timestamps?.updated_at || null,
          viewers: backendToken.viewers || 0
        },
        raw_data: backendToken
      };
    };

    // Create a ReadableStream with improved JSON handling
    const stream = new ReadableStream({
      start(controller) {
        let isClosed = false;
        let sseDataBuffer = '';  // Buffer for SSE data lines
              // Event data tracking removed as it's not being used  // Buffer for current event data
        let abortController: AbortController | null = null;

          const safeEnqueue = (data: Uint8Array) => {
          if (!isClosed && !controller.desiredSize === null) {
            try {
              controller.enqueue(data);
            } catch (error) {
              console.error('Controller enqueue error:', error);
              isClosed = true;
              // Clean up any active connections
              if (abortController && !abortController.signal.aborted) {
                abortController.abort();
              }
            }
          }
        };

        const safeClose = () => {
          if (!isClosed) {
            try {
              //console.log('🔌 Closing SSE connection');
              controller.close();
              isClosed = true;
              // Clean up resources
              if (abortController && !abortController.signal.aborted) {
                abortController.abort();
              }
            } catch (error) {
              console.error('Controller close error:', error);
              isClosed = true;
            }
          }
        };

        const safeError = (error: unknown) => {
          if (!isClosed) {
            try {
              controller.error(error);
              isClosed = true;
            } catch (controllerError) {
              console.error('Controller error handling failed:', controllerError);
            }
          }
        };

        // Enhanced JSON validation and fixing
        const validateAndFixJSON = (jsonStr: string): string | null => {
          try {
            // Quick validation - try parsing as-is first
            JSON.parse(jsonStr);
            return jsonStr;
          } catch {
            if (DEBUG_JSON) {
              //console.log('🔧 JSON needs fixing, attempting repairs...');
            }

            let fixed = jsonStr
              // Normalize whitespace and newlines
              .replace(/\s+/g, ' ')
              .trim()
              // Fix common quote issues
              .replace(/'/g, '"')
              // Fix trailing commas
              .replace(/,\s*([}\]])/g, '$1')
              // Fix unquoted keys
              .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
              // Fix some unquoted string values (but preserve numbers, booleans, null)
              .replace(/:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*([,}\]])/g, (match, value, suffix) => {
                if (['true', 'false', 'null'].includes(value)) return match;
                return `:"${value}"${suffix}`;
              });

            // Check for balanced braces and brackets
            let braceDepth = 0;
            let bracketDepth = 0;
            let inString = false;
            let escapeNext = false;

            for (let i = 0; i < fixed.length; i++) {
              const char = fixed[i];

              if (escapeNext) {
                escapeNext = false;
                continue;
              }

              if (char === '\\') {
                escapeNext = true;
                continue;
              }

              if (char === '"' && !escapeNext) {
                inString = !inString;
                continue;
              }

              if (!inString) {
                if (char === '{') braceDepth++;
                if (char === '}') braceDepth--;
                if (char === '[') bracketDepth++;
                if (char === ']') bracketDepth--;
              }
            }

            // Add missing closing braces/brackets
            while (braceDepth > 0) {
              fixed += '}';
              braceDepth--;
            }
            while (bracketDepth > 0) {
              fixed += ']';
              bracketDepth--;
            }

            // Close unterminated strings
            if (inString) {
              fixed += '"';
            }

            try {
              JSON.parse(fixed);
              if (DEBUG_JSON) {
                //console.log('✅ JSON successfully fixed');
              }
              return fixed;
            } catch (fixError) {
              console.error('❌ JSON fix failed:', fixError instanceof Error ? fixError.message : String(fixError));
              if (DEBUG_JSON) {
                console.error('❌ Failed JSON (first 500 chars):', fixed.substring(0, 500));
              }
              return null;
            }
          }
        };

        // Function removed - was not being used

        // Connect to SSE with massive payload handling
        const connectSSE = async () => {
          try {
            abortController = new AbortController();
            //console.log('Connecting to backend SSE:', sseUrl);
            
            const response = await fetch(sseUrl, {
              method: 'GET',
              headers: {
                'Accept': 'text/event-stream',
                'Cache-Control': 'no-cache',
              },
              signal: abortController.signal,
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error('No reader available from response body');
            }

            const decoder = new TextDecoder();
            //console.log('SSE connection established, preparing for large payload streaming...');

            let fullEventBuffer = '';  // Buffer for complete SSE event
            let isInsideDataEvent = false;
            let eventStartTime = Date.now();
            const MAX_EVENT_SIZE = 50 * 1024 * 1024; // 50MB limit for safety
            const TIMEOUT_MS = 60000; // 60 second timeout for complete event

            // Read the SSE stream with large payload support
            while (!isClosed && !abortController?.signal.aborted) {
              try {
                const { done, value } = await reader.read();

                if (done) {
                  //console.log('SSE stream ended normally');
                  // Process any remaining complete event in buffer
                  if (fullEventBuffer.trim()) {
                    //console.log(`Processing final event buffer (${fullEventBuffer.length} chars)...`);
                    await processLargeEvent(fullEventBuffer.trim());
                  }
                  safeClose();
                  break;
                }

                const chunk = decoder.decode(value, { stream: true });
                if (chunk) {
                  // Add to SSE data buffer
                  sseDataBuffer += chunk;

                  // Process complete SSE lines
                  const lines = sseDataBuffer.split('\n');
                  sseDataBuffer = lines.pop() || ''; // Keep incomplete line in buffer

                  for (const line of lines) {
                    const trimmedLine = line.trim();
                    
                    if (trimmedLine.startsWith('data: ')) {
                      if (!isInsideDataEvent) {
                        // Starting new event
                        isInsideDataEvent = true;
                        eventStartTime = Date.now();
                        fullEventBuffer = '';
                        //console.log('📦 Starting to receive large SSE event...');
                      }

                      const dataContent = trimmedLine.substring(6);
                      fullEventBuffer += dataContent;
                      
                      // Safety check for event size
                      if (fullEventBuffer.length > MAX_EVENT_SIZE) {
                        console.error(`❌ Event too large (${fullEventBuffer.length} chars), discarding...`);
                        fullEventBuffer = '';
                        isInsideDataEvent = false;
                        continue;
                      }

                      // Timeout check
                      if (Date.now() - eventStartTime > TIMEOUT_MS) {
                        console.error('❌ Event reception timeout, discarding partial event...');
                        fullEventBuffer = '';
                        isInsideDataEvent = false;
                        continue;
                      }

                      // Progress logging for large events
                      if (fullEventBuffer.length > 0 && fullEventBuffer.length % 100000 === 0) {
                        //console.log(`📊 Received ${Math.round(fullEventBuffer.length / 1000)}KB of event data...`);
                      }
                    }
                    
                    // Handle event boundaries (empty line ends the event)
                    else if (trimmedLine === '' && isInsideDataEvent && fullEventBuffer.trim()) {
                      // Complete event received
                      const eventSize = fullEventBuffer.length;
                      const duration = Date.now() - eventStartTime;
                      //console.log(`✅ Complete SSE event received: ${Math.round(eventSize / 1000)}KB in ${duration}ms`);
                      
                      // Process the complete large event
                      await processLargeEvent(fullEventBuffer);
                      
                      // Reset for next event
                      fullEventBuffer = '';
                      isInsideDataEvent = false;
                    }
                  }

                  // Forward the SSE data to the client
                  safeEnqueue(new TextEncoder().encode(chunk));
                }
              } catch (readError) {
                if (!abortController?.signal.aborted) {
                  console.error('Stream read error:', readError);
                  safeError(readError);
                }
                break;
              }
            }

          } catch (error) {
            if (!abortController?.signal.aborted && !isClosed) {
              console.error('SSE connection error:', error instanceof Error ? error.message : String(error));
              safeError(error);
            }
          }
        };

        // Process large SSE events (12K+ lines of JSON)
        const processLargeEvent = async (eventData: string) => {
          //console.log(`🔍 Processing large event: ${Math.round(eventData.length / 1000)}KB`);
          
          try {
            // For very large JSON, we need more aggressive preprocessing
            const processedData = eventData
              .replace(/\r\n/g, '\n')  // Normalize line endings
              .replace(/\r/g, '\n')    // Handle old Mac line endings
              .replace(/\n+/g, ' ')    // Collapse multiple newlines to space
              .replace(/\s+/g, ' ')    // Normalize all whitespace
              .trim();

            if (DEBUG_JSON) {
              //console.log('📏 Preprocessed data length:', processedData.length);
              //console.log('📝 Data preview:', processedData.substring(0, 200) + '...');
            }

            // Validate JSON structure before parsing
            const fixedJSON = validateAndFixJSON(processedData);
            if (!fixedJSON) {
              console.error('❌ Unable to fix malformed JSON in large event');
              return;
            }

            //console.log('🎯 Attempting to parse large JSON payload...');
            const startTime = Date.now();
            const jsonData = JSON.parse(fixedJSON);
            const parseTime = Date.now() - startTime;
            
            //console.log(`✅ Large JSON parsed successfully in ${parseTime}ms`);

            // Handle backend SSE format
            if (jsonData.event === 'tokens_update' && jsonData.data?.tokens) {
              const receivedCount = jsonData.data.tokens.length;
              const expectedCount = jsonData.data.total_count;
              
              //console.log(`📊 Event contains ${receivedCount} tokens (expected: ${expectedCount || 'unknown'})`);

              // Validate we have complete dataset
              if (expectedCount && receivedCount < expectedCount) {
                console.warn(`⚠️ Incomplete dataset: got ${receivedCount}/${expectedCount} tokens, skipping update...`);
                return;
              }

              if (receivedCount === 0) {
                console.warn('⚠️ No tokens in dataset, skipping update...');
                return;
              }

              //console.log(`🔄 Transforming ${receivedCount} tokens...`);
              const transformStartTime = Date.now();
              const transformedTokens = jsonData.data.tokens.map(transformBackendToken);
              const transformTime = Date.now() - transformStartTime;
              
              //console.log(`✅ Token transformation completed in ${transformTime}ms`);

              const completeData = {
                event: 'live_tokens_update',
                timestamp: jsonData.timestamp || new Date().toISOString(),
                token_count: transformedTokens.length,
                data: transformedTokens,
                last_sse_update: new Date().toISOString(),
                backend_total_count: expectedCount || transformedTokens.length
              };

              //console.log(`💾 Storing ${transformedTokens.length} tokens in memory...`);
              const writeStartTime = Date.now();
              tokenStorage.setTokens(completeData);
              const writeTime = Date.now() - writeStartTime;
              
              //console.log(`🎉 Successfully updated in-memory storage with ${transformedTokens.length} tokens (store: ${writeTime}ms)`);
            } else {
              //console.log('ℹ️ Event does not contain token update data, ignoring...');
            }
          } catch (error) {
            console.error('❌ Large event processing failed:', error instanceof Error ? error.message : String(error));
            if (DEBUG_JSON && error instanceof SyntaxError) {
              console.error('❌ JSON syntax error details:', error.message);
              // For very large JSON, only show a small sample around the error
              const errorMatch = error.message.match(/position (\d+)/);
              if (errorMatch) {
                const pos = parseInt(errorMatch[1]);
                const start = Math.max(0, pos - 200);
                const end = Math.min(eventData.length, pos + 200);
                console.error('❌ Context around error:', eventData.substring(start, end));
              }
            }
          }
        };

        // Start the SSE connection
        connectSSE().catch((error) => {
          if (!isClosed) {
            console.error('Failed to start SSE connection:', error);
            safeError(error);
          }
        });

        // Cleanup function
        return () => {
          //console.log('SSE connection cleanup initiated');
          isClosed = true;
          if (abortController) {
            abortController.abort();
          }
        };
      },
      
      cancel() {
        //console.log('SSE connection cancelled by client');
      },
    });

    // Return the streaming response
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to livestream', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}