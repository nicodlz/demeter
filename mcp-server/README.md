# Demeter MCP Server

Model Context Protocol server for structured access to the Demeter project.

## Features

### Resources
- `demeter://store/schema` - Complete Zustand store structure
- `demeter://project/structure` - Project directory tree
- `demeter://config/vite` - Vite configuration
- `demeter://config/tailwind` - Tailwind configuration

### Tools
- `read_component` - Read React component source code
- `read_store_slice` - Read a Zustand store slice
- `exec_command` - Execute project commands (build, typecheck, lint, etc.)
- `list_components` - List all components in the project
- `read_service` - Read service/API client files

## Usage

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "demeter": {
      "command": "node",
      "args": ["/home/ubuntu/.openclaw/workspace/demeter/mcp-server/index.js"]
    }
  }
}
```

### With OpenClaw

Add to OpenClaw config (if MCP support is available):

```json
{
  "mcp": {
    "servers": {
      "demeter": {
        "command": "node",
        "args": ["/home/ubuntu/.openclaw/workspace/demeter/mcp-server/index.js"],
        "cwd": "/home/ubuntu/.openclaw/workspace/demeter"
      }
    }
  }
}
```

### Manual Testing

```bash
cd /home/ubuntu/.openclaw/workspace/demeter/mcp-server
node index.js
```

The server uses stdio for communication. Send JSON-RPC requests on stdin, receive responses on stdout.

## Examples

### List available tools
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}
```

### Read a component
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "read_component",
    "arguments": {
      "path": "components/Layout.tsx"
    }
  }
}
```

### Read store schema
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/read",
  "params": {
    "uri": "demeter://store/schema"
  }
}
```

## Development

```bash
npm install
npm start
```

## Security

This server only provides read access to source files and can execute whitelisted npm scripts. It does not expose file write or arbitrary command execution.
