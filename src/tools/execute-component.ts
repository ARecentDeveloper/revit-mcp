import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { withRevitConnection } from "../utils/ConnectionManager.js";
import * as fs from 'fs';
import * as path from 'path';

export function registerExecuteComponentTool(server: McpServer) {
  server.tool(
    "execute_component",
    "Execute a component from revit-components folder for rapid prototyping. Components can have multiple .cs files that are compiled together.",
    {
      component: z
        .string()
        .describe("Component folder name (e.g., 'wall-counter')"),
      method: z
        .string()
        .optional()
        .describe("Method to call (default: 'Run')"),
      parameters: z
        .object({})
        .optional()
        .describe("Parameters to pass to the method"),
      includeShared: z
        .boolean()
        .optional()
        .describe("Include files from _shared folder")
    },
    async (args, extra) => {
    try {
      const componentPath = path.join(
        "E:\\VDC\\revit-mcp-workspace\\revit-components",
        args.component
      );
      
      if (!fs.existsSync(componentPath)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `Component '${args.component}' not found at ${componentPath}`
              }, null, 2)
            }
          ]
        };
      }
      
      const files: Array<{name: string, content: string}> = [];
      
      // Include shared files if requested
      if (args.includeShared !== false) {
        const sharedPath = path.join(
          "E:\\VDC\\revit-mcp-workspace\\revit-components",
          "_shared"
        );
        
        if (fs.existsSync(sharedPath)) {
          const sharedFiles = fs.readdirSync(sharedPath)
            .filter(f => f.endsWith('.cs'))
            .map(f => ({
              name: `_shared/${f}`,
              content: fs.readFileSync(path.join(sharedPath, f), 'utf-8')
            }));
          files.push(...sharedFiles);
        }
      }
      
      // Read all .cs files from component folder
      const componentFiles = fs.readdirSync(componentPath)
        .filter(f => f.endsWith('.cs'))
        .map(f => ({
          name: f,
          content: fs.readFileSync(path.join(componentPath, f), 'utf-8')
        }));
      
      files.push(...componentFiles);
      
      if (files.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: `No .cs files found in component '${args.component}'`
              }, null, 2)
            }
          ]
        };
      }
      
      // Send to Revit for compilation and execution
      const result = await withRevitConnection(async (client) => {
        return await client.sendCommand("ExecuteComponent", {
          componentName: args.component,
          files: files,
          method: args.method || "Run",
          methodParameters: args.parameters
        });
      });
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              component: args.component,
              filesCompiled: files.map(f => f.name),
              result: result
            }, null, 2)
          }
        ]
      };
      
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : String(error),
              details: error instanceof Error ? error.stack : undefined
            }, null, 2)
          }
        ]
      };
    }
    }
  );
}