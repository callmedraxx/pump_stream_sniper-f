// import { NextRequest, NextResponse } from 'next/server';
// import { promises as fs } from 'fs';
// import path from 'path';

// export async function GET(request: NextRequest) {
//   const url = new URL(request.url);
//   const action = url.searchParams.get('action');

//   // Handle file reading
//   if (action === 'file') {
//     try {
//       const dashboardDir = path.join(process.cwd(), 'src', 'app', 'dashboard');
//       const tokensFilePath = path.join(dashboardDir, 'tokens.json');

//       const fileContent = await fs.readFile(tokensFilePath, 'utf-8');
//       const data = JSON.parse(fileContent);

//       return NextResponse.json(data);
//     } catch (error) {
//       return NextResponse.json(
//         { error: 'Tokens file not found', details: error instanceof Error ? error.message : 'Unknown error' },
//         { status: 404 }
//       );
//     }
//   }

//   try {
//     // Get the backend API URL from environment variables
//     const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

//     console.log('Fetching tokens from backend:', `${backendUrl}/tokens`);

//     // First, get the total count to see how many tokens exist
//     const countResponse = await fetch(`${backendUrl}/tokens?limit=1&sort_by=age&sort_order=desc`, {
//       method: 'GET',
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/json',
//       },
//     });

//     let totalTokens = 0;
//     if (countResponse.ok) {
//       const countData = await countResponse.json();
//       totalTokens = countData.data?.pagination?.total || 0;
//       console.log(`Backend reports ${totalTokens} total tokens`);
//     }

//     // Fetch all tokens with pagination
//     const allTokens: any[] = [];
//     const batchSize = 100; // Fetch in batches of 100
//     const totalBatches = Math.ceil(totalTokens / batchSize) || 10; // Default to 10 batches if we can't get the count

//     console.log(`Fetching tokens in ${totalBatches} batches of ${batchSize}...`);

//     for (let batch = 0; batch < totalBatches; batch++) {
//       const offset = batch * batchSize;
//       console.log(`Fetching batch ${batch + 1}/${totalBatches} (offset: ${offset})`);

//       const response = await fetch(`${backendUrl}/tokens?format=compact&limit=${batchSize}&offset=${offset}&sort_by=age&sort_order=desc`, {
//         method: 'GET',
//         headers: {
//           'Accept': 'application/json',
//           'Content-Type': 'application/json',
//         },
//       });

//       if (!response.ok) {
//         console.error(`Failed to fetch batch ${batch + 1}: HTTP ${response.status}`);
//         continue; // Continue with other batches
//       }

//       const batchData = await response.json();
//       if (batchData.success && batchData.data?.tokens) {
//         allTokens.push(...batchData.data.tokens);
//         console.log(`Batch ${batch + 1}: Got ${batchData.data.tokens.length} tokens (total so far: ${allTokens.length})`);
//       } else {
//         console.error(`Invalid response for batch ${batch + 1}:`, batchData);
//       }

//       // Small delay to be nice to the backend
//       await new Promise(resolve => setTimeout(resolve, 100));
//     }

//     console.log(`✅ Fetched ${allTokens.length} tokens total from backend`);

//     if (allTokens.length === 0) {
//       return NextResponse.json(
//         { error: 'No tokens received from backend' },
//         { status: 500 }
//       );
//     }

//     // Transform backend tokens to match our LiveToken interface
//     const transformedTokens = allTokens.map((token: any) => ({
//       token_info: {
//         mint: token.mint_address,
//         name: token.name,
//         symbol: token.symbol,
//         description: null,
//         image_uri: token.image_url,
//         metadata_uri: null,
//         video_uri: null
//       },
//       market_data: {
//         market_cap: token.mcap,
//         usd_market_cap: token.mcap, // Assuming mcap is already in USD
//         progress_percentage: token.progress || 0,
//         last_trade_formatted: null
//       },
//       creator_info: {
//         creator: token.creator,
//         created_formatted: token.age
//       },
//       social_links: {
//         twitter: null
//       },
//       status_flags: {
//         is_currently_live: token.is_live,
//         nsfw: false, // Default to false, backend doesn't provide this
//         show_name: true
//       },
//       trading_info: {
//         virtual_sol_reserves: 0, // Backend doesn't provide these
//         real_sol_reserves: 0,
//         total_sol: 0,
//         progress_percentage: token.progress || 0,
//         last_trade_timestamp: null,
//         last_trade_formatted: null,
//         market_cap: token.mcap,
//         usd_market_cap: token.mcap
//       },
//       pool_info: {
//         complete: false, // Backend doesn't provide this
//         is_currently_live: token.is_live,
//         king_of_hill_timestamp: null,
//         last_reply: null,
//         reply_count: 0, // Backend doesn't provide this
//         raydium_pool: null,
//         curve_threshold: null
//       },
//       activity_info: {
//         created_timestamp: token.age ? new Date(token.age).getTime() / 1000 : null,
//         created_formatted: token.age,
//         nsfw: false,
//         show_name: true,
//         creator: token.creator,
//         dev_buy: null,
//         dev_sell: null,
//         sniping: null,
//         last_updated: token.updated_at
//       },
//       raw_data: token // Keep original backend data
//     }));

//     // Create the data structure for tokens.json
//     const tokensData = {
//       event: 'live_tokens_update',
//       timestamp: new Date().toISOString(),
//       token_count: transformedTokens.length,
//       data: transformedTokens,
//       backend_info: {
//         total_tokens: totalTokens,
//         fetched_tokens: allTokens.length,
//         transformed_tokens: transformedTokens.length,
//         fetched_at: new Date().toISOString(),
//         backend_url: backendUrl
//       }
//     };

//     // Save to tokens.json in dashboard folder
//     const dashboardDir = path.join(process.cwd(), 'src', 'app', 'dashboard');
//     const tokensFilePath = path.join(dashboardDir, 'tokens.json');

//     // Ensure dashboard directory exists
//     await fs.mkdir(dashboardDir, { recursive: true });

//     // Write tokens data to file
//     await fs.writeFile(tokensFilePath, JSON.stringify(tokensData, null, 2), 'utf8');

//     console.log(`✅ Successfully saved ${transformedTokens.length} tokens to tokens.json`);

//     return NextResponse.json({
//       success: true,
//       message: `Fetched and saved ${transformedTokens.length} tokens`,
//       data: {
//         token_count: transformedTokens.length,
//         backend_total: totalTokens,
//         fetched_raw: allTokens.length,
//         saved_at: new Date().toISOString()
//       }
//     });

//   } catch (error) {
//     console.error('Error in fetch_live route:', error);
//     return NextResponse.json(
//       {
//         error: 'Failed to fetch and save tokens',
//         details: error instanceof Error ? error.message : 'Unknown error'
//       },
//       { status: 500 }
//     );
//   }
// }
