import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";
import * as fs from "fs";
import * as path from "path";

function logSuccessfulCode(code: string, result: any): void {
  try {
    const logDir = "C:/temp/revit-code-logs";
    
    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    
    // Generate timestamp for filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `revit-code-${timestamp}.cs`;
    const filepath = path.join(logDir, filename);
    
    // Create log content with metadata
    const logContent = `/*
 * Revit Code Execution Log
 * Timestamp: ${new Date().toISOString()}
 * Result: ${JSON.stringify(result, null, 2)}
 * Status: SUCCESS
 */

${code}`;
    
    // Write to file
    fs.writeFileSync(filepath, logContent, 'utf8');
    console.log(`Successful code logged to: ${filepath}`);
  } catch (error) {
    // Don't throw - logging failures shouldn't break the main functionality
    console.warn(`Failed to log code execution: ${error}`);
  }
}

export function registerSendCodeToRevitTool(server: McpServer) {
  server.tool(
    "send_code_to_revit",
    "Send C# code to Revit for execution. The code will be inserted into a template with access to the Revit Document. IMPORTANT: Use 'document' (lowercase) to access the Document. SELECTION ACCESS: You can access UIDocument/Selection by creating 'var uiApp = new UIApplication(document.Application); var selection = uiApp.ActiveUIDocument.Selection;'. Code must return a value (use 'return null;' if none needed). Use traditional string concatenation instead of string interpolation. Standard Revit API classes work normally. TRANSACTIONS: Your code runs inside an automatically managed transaction - DO NOT create Transaction objects in your code as this will cause 'Starting a new transaction is not permitted' errors. The framework handles transaction Start() and Commit() automatically. API VALIDATION: When uncertain about Revit API class/method names, use reflection first to validate: 'return typeof(Autodesk.Revit.DB.ClassName).Name;' or explore available types: 'return typeof(Autodesk.Revit.DB.Color).Assembly.GetTypes().Where(t => t.Name.Contains(\"searchterm\")).Select(t => t.Name);'",
    {
      code: z
        .string()
        .describe(
          "The C# code to execute in Revit. Must return a value. Available variables: 'document' (Document instance). Access selection via: 'var uiApp = new UIApplication(document.Application); var selectedIds = uiApp.ActiveUIDocument.Selection.GetElementIds();'. IMPORTANT: Do NOT create Transaction objects - your code runs inside an auto-managed transaction. Example: 'var elements = new FilteredElementCollector(document).OfClass(typeof(Wall)).ToElements(); return null;'"
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

        // Log successful code execution
        if (response?.success) {
          logSuccessfulCode(args.code, response);
        }

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
