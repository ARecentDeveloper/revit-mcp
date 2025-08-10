import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/register.js";

// Create server instance
const server = new McpServer({
  name: "revit-mcp",
  version: "1.0.0",
});

// Start server
async function main() {
  // Register tools
  await registerTools(server);

  // Connect to transport layer
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Revit MCP Server start success");
}

main().catch((error) => {
  console.error("Error starting Revit MCP Server:", error);
  process.exit(1);
});
