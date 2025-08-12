import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerConduitManagementTool(server: McpServer) {
  server.tool(
    "conduit_management",
    "Manage conduits in the active view - either highlight unconnected conduits in red or connect unconnected fittings to nearby MEP curves",
    {
      action: z
        .enum(["highlight", "connect"])
        .describe("Action to perform: 'highlight' to color unconnected conduits red, 'connect' to connect unconnected fittings to nearby MEP curves"),
      proximityDistance: z
        .number()
        .optional()
        .default(0.5)
        .describe("Proximity distance in inches for connecting fittings (only used with 'connect' action)"),
    },
    async (args, extra) => {
      const params = args;
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("conduit_management", params);
        });

        return {
          content: [
            {
              type: "text",
              text: `Conduit management operation successful! Result: ${JSON.stringify(response, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Conduit management operation failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}