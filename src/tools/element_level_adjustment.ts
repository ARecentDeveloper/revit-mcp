import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerElementLevelAdjustmentTool(server: McpServer) {
  server.tool(
    "element_level_adjustment",
    "Adjust the level assignment of selected Revit elements. Supports both automatic assignment to closest level and manual assignment to a specific level while maintaining absolute elevation.",
    {
      // CRITICAL: Must use data wrapper - this is the established pattern in this codebase
      data: z.object({
        mode: z
          .enum(["auto", "manual"])
          .describe("Mode of operation: 'auto' assigns elements to their closest level based on current elevation, 'manual' assigns to a specific target level"),
        targetLevelName: z
          .string()
          .optional()
          .describe("Name of the target level (required for manual mode, ignored for auto mode)"),
        maintainElevation: z
          .boolean()
          .optional()
          .default(true)
          .describe("Whether to maintain the absolute elevation of elements when changing levels (default: true)"),
      })
    },
    async (args, extra) => {
      const params = args;
      try {
        // Validate parameters based on mode
        if (params.data.mode === "manual" && !params.data.targetLevelName) {
          return {
            content: [
              {
                type: "text",
                text: "Error: targetLevelName is required when mode is 'manual'",
              },
            ],
          };
        }

        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("element_level_adjustment", params.data);
        });

        return {
          content: [
            {
              type: "text",
              text: `Level adjustment operation successful!\n\n${JSON.stringify(response, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Level adjustment operation failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}