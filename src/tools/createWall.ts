// import { z } from "zod";
// import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { RevitClientConnection } from "../utils/SocketClient.js";

// export function registerCreateWallTool(server: McpServer) {
//   server.tool(
//     "createWall",
//     "create wall",
//     {
//       startX: z.number(),
//       startY: z.number(),
//       endX: z.number(),
//       endY: z.number(),
//       height: z.number(),
//       thickness: z.number(),
//     },
//     async (args, extra) => {
//       // Create parameter object
//       const params = {
//         startX: args.startX,
//         startY: args.startY,
//         endX: args.endX,
//         endY: args.endY,
//         height: args.height,
//         thickness: args.thickness,
//       };

//       const revitClient = new RevitClientConnection("localhost", 8080);

//       try {
//         // Wait for connection to establish
//         await new Promise<void>((resolve, reject) => {
//           // If already connected, resolve directly
//           if (revitClient.isConnected) {
//             resolve();
//             return;
//           }

//           // Set up temporary event listeners
//           const onConnect = () => {
//             revitClient.socket.removeListener("connect", onConnect);
//             revitClient.socket.removeListener("error", onError);
//             resolve();
//           };

//           const onError = (error: any) => {
//             revitClient.socket.removeListener("connect", onConnect);
//             revitClient.socket.removeListener("error", onError);
//             reject(new Error("Failed to connect to Revit client"));
//           };

//           // Add event listeners
//           revitClient.socket.on("connect", onConnect);
//           revitClient.socket.on("error", onError);

//           // Connect to server
//           revitClient.connect();

//           // Set connection timeout
//           setTimeout(() => {
//             revitClient.socket.removeListener("connect", onConnect);
//             revitClient.socket.removeListener("error", onError);
//             reject(new Error("Connection to Revit client timed out"));
//           }, 5000);
//         });

//         // Use new sendCommand method, directly pass command name and parameters
//         const response = await revitClient.sendCommand("createWall", params);

//         // Check if there are error messages
//         if (response.errorMessage && response.errorMessage.trim() !== "") {
//           return {
//             content: [
//               {
//                 type: "text",
//                 text: `Wall creation failed: ${response.errorMessage}`,
//               },
//             ],
//             isError: true,
//           };
//         }

//         // Successfully created wall, return detailed information
//         return {
//           content: [
//             {
//               type: "text",
//               text: `Wall created successfully!\nWall ID: ${response.elementId}\nStart Point: (${response.startPoint.x}, ${response.startPoint.y})\nEnd Point: (${response.endPoint.x}, ${response.endPoint.y})\nHeight: ${response.height}\nThickness: ${response.thickness}`,
//             },
//           ],
//           isError: false,
//         };
//       } catch (error) {
//         return {
//           content: [
//             {
//               type: "text",
//               text: `Error processing Revit response: ${
//                 error instanceof Error ? error.message : String(error)
//               }`,
//             },
//           ],
//           isError: true,
//         };
//       } finally {
//         // Close connection after operation completes
//         revitClient.disconnect();
//       }
//     }
//   );
// }
