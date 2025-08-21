import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";

export function registerSendCodeToRevitTool(server: McpServer) {
  server.tool(
    "send_code_to_revit",
    "Send C# code to Revit for execution. The code will be inserted into a template with access to the Revit Document. IMPORTANT: Use 'document' (lowercase) to access the Document. No access to UIDocument/Selection - use FilteredElementCollector for element queries. Code must return a value (use 'return null;' if none needed). Use traditional string concatenation instead of string interpolation. Standard Revit API classes work normally.",
    {
      code: z
        .string()
        .describe(
          "The C# code to execute in Revit. Must return a value. Available variables: 'document' (Document instance). Use FilteredElementCollector for element queries since UIDocument/Selection are not available. Example: 'var elements = new FilteredElementCollector(document).OfClass(typeof(Wall)).ToElements(); return null;'"
        ),
      parameters: z
        .array(z.any())
        .optional()
        .describe(
          "Optional execution parameters that will be passed to your code"
        ),
    },
    async (args, extra) => {
      const params = {
        code: args.code,
        parameters: args.parameters || [],
      };

      try {
        const response = await withRevitConnection(async (revitClient) => {
          return await revitClient.sendCommand("send_code_to_revit", params);
        });

        return {
          content: [
            {
              type: "text",
              text: `Code execution successful!\nResult: ${JSON.stringify(
                response,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Code execution failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
        };
      }
    }
  );
}
