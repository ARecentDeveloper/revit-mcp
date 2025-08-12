import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerPlaceHangersTool(server: McpServer) {
  server.tool(
    "place_hangers",
    "Place hangers on pipes or conduits using either interactive clicking or parametric spacing. Supports both Clevis and Trapeze hanger types.",
    {
      placement_mode: z
        .enum(["click", "parametric"])
        .describe("Placement mode: 'click' for interactive placement by clicking on elements, 'parametric' for automatic placement at specified intervals"),
      hanger_type: z
        .enum(["Clevis Hanger", "Trapeze Hanger"])
        .describe("Type of hanger to place"),
      target_category: z
        .enum(["Pipe", "Conduit"])
        .optional()
        .describe("Target category - if not specified, will auto-detect from current selection or prompt user"),
      spacing: z
        .string()
        .optional()
        .default("6'")
        .describe("Spacing between hangers for parametric mode (e.g., '6\\'', '72\"', '1.5'). Only used in parametric mode"),
      start_offset: z
        .string()
        .optional()
        .default("0")
        .describe("Offset from start of element for parametric mode (e.g., '1\\'', '12\"'). Only used in parametric mode"),
      end_offset: z
        .string()
        .optional()
        .default("0")
        .describe("Offset from end of element for parametric mode (e.g., '1\\'', '12\"'). Only used in parametric mode"),
    },
    async (args, extra) => {
      const params = args;
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("place_hangers", params);
        });

        return {
          content: [
            {
              type: "text",
              text: `Hanger placement operation successful! Result: ${JSON.stringify(response, null, 2)}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Hanger placement operation failed: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
        };
      }
    }
  );
}