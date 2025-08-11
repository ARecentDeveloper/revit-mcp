import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerColorConduitRunsTool(server: McpServer) {
  server.tool(
    "color_conduit_runs",
    "Color conduit runs by analyzing connectivity between conduits and fittings. Each connected run gets assigned a unique random color.",
    {
      // No parameters needed for the simple version - uses active view and random colors
    },
    async (args, extra) => {
      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("color_conduit_runs", {});
        });

        if (response.success) {
          let resultText = `Successfully colored ${response.totalRuns} conduit run(s).\n\n`;
          
          if (response.runs && response.runs.length > 0) {
            resultText += "Conduit Run Details:\n";
            response.runs.forEach((run: any, index: number) => {
              const rgb = run.color;
              resultText += `- Run ${index + 1}: ${run.elementCount} elements colored with RGB(${rgb.r}, ${rgb.g}, ${rgb.b})\n`;
            });
          }

          if (response.totalElements) {
            resultText += `\nTotal elements processed: ${response.totalElements}`;
          }

          return {
            content: [
              {
                type: "text",
                text: resultText,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: `Conduit run coloring failed: ${response.message}`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Conduit run coloring failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}