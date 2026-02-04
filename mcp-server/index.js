#!/usr/bin/env node
/**
 * Demeter MCP Server
 * Provides structured access to Demeter project context
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

// Initialize MCP server
const server = new Server(
  {
    name: 'demeter-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      resources: {},
      tools: {},
    },
  }
);

// Helper: Read file with error handling
function readFile(relativePath) {
  try {
    const fullPath = join(PROJECT_ROOT, relativePath);
    return readFileSync(fullPath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${relativePath}: ${error.message}`);
  }
}

// Helper: List directory recursively
function listDir(dir, baseDir = dir, extensions = []) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);
    
    // Skip node_modules, .git, dist
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist') {
      continue;
    }
    
    if (entry.isDirectory()) {
      files.push(...listDir(fullPath, baseDir, extensions));
    } else if (extensions.length === 0 || extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(relativePath);
    }
  }
  
  return files;
}

// Register resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'demeter://store/schema',
        name: 'Zustand Store Schema',
        description: 'Complete Zustand store structure with all slices',
        mimeType: 'text/plain',
      },
      {
        uri: 'demeter://project/structure',
        name: 'Project Structure',
        description: 'Directory tree of the Demeter project',
        mimeType: 'text/plain',
      },
      {
        uri: 'demeter://config/vite',
        name: 'Vite Configuration',
        description: 'Vite build configuration',
        mimeType: 'text/typescript',
      },
      {
        uri: 'demeter://config/tailwind',
        name: 'Tailwind Configuration',
        description: 'Tailwind CSS configuration',
        mimeType: 'text/javascript',
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  
  if (uri === 'demeter://store/schema') {
    const storeFiles = listDir(join(PROJECT_ROOT, 'src/store'), join(PROJECT_ROOT, 'src/store'), ['.ts']);
    const content = storeFiles.map(file => {
      const code = readFile(join('src/store', file));
      return `\n// ${file}\n${code}`;
    }).join('\n\n---\n');
    
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: content,
      }],
    };
  }
  
  if (uri === 'demeter://project/structure') {
    const srcFiles = listDir(join(PROJECT_ROOT, 'src'), join(PROJECT_ROOT, 'src'));
    const tree = srcFiles.map(f => `  ${f}`).join('\n');
    
    return {
      contents: [{
        uri,
        mimeType: 'text/plain',
        text: `Demeter Project Structure:\n\nsrc/\n${tree}`,
      }],
    };
  }
  
  if (uri === 'demeter://config/vite') {
    return {
      contents: [{
        uri,
        mimeType: 'text/typescript',
        text: readFile('vite.config.ts'),
      }],
    };
  }
  
  if (uri === 'demeter://config/tailwind') {
    return {
      contents: [{
        uri,
        mimeType: 'text/javascript',
        text: readFile('tailwind.config.js'),
      }],
    };
  }
  
  throw new Error(`Unknown resource: ${uri}`);
});

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_component',
        description: 'Read a React component source code',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Component path relative to src/ (e.g., "components/Layout.tsx")',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'read_store_slice',
        description: 'Read a specific Zustand store slice',
        inputSchema: {
          type: 'object',
          properties: {
            slice: {
              type: 'string',
              description: 'Slice name (e.g., "cryptoSlice", "authSlice")',
            },
          },
          required: ['slice'],
        },
      },
      {
        name: 'exec_command',
        description: 'Execute a project command (build, typecheck, lint)',
        inputSchema: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'Command to execute',
              enum: ['build', 'dev', 'typecheck', 'lint', 'preview'],
            },
          },
          required: ['command'],
        },
      },
      {
        name: 'list_components',
        description: 'List all React components in the project',
        inputSchema: {
          type: 'object',
          properties: {
            directory: {
              type: 'string',
              description: 'Directory to search in (default: src/components)',
              default: 'src/components',
            },
          },
        },
      },
      {
        name: 'read_service',
        description: 'Read a service/API client file',
        inputSchema: {
          type: 'object',
          properties: {
            service: {
              type: 'string',
              description: 'Service name (e.g., "zerionApi", "bitcoinApi")',
            },
          },
          required: ['service'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    if (name === 'read_component') {
      const componentPath = join('src', args.path);
      const content = readFile(componentPath);
      return {
        content: [{ type: 'text', text: content }],
      };
    }
    
    if (name === 'read_store_slice') {
      const slicePath = join('src/store/slices', `${args.slice}.ts`);
      const content = readFile(slicePath);
      return {
        content: [{ type: 'text', text: content }],
      };
    }
    
    if (name === 'exec_command') {
      const allowedCommands = {
        build: 'npm run build',
        dev: 'npm run dev',
        typecheck: 'npm run typecheck',
        lint: 'npm run lint',
        preview: 'npm run preview',
      };
      
      const cmd = allowedCommands[args.command];
      if (!cmd) {
        throw new Error(`Unknown command: ${args.command}`);
      }
      
      const { stdout, stderr } = await exec(cmd, { cwd: PROJECT_ROOT, timeout: 30000 });
      return {
        content: [{ 
          type: 'text', 
          text: `Command: ${cmd}\n\nStdout:\n${stdout}\n\nStderr:\n${stderr}` 
        }],
      };
    }
    
    if (name === 'list_components') {
      const dir = args.directory || 'src/components';
      const components = listDir(join(PROJECT_ROOT, dir), join(PROJECT_ROOT, dir), ['.tsx', '.ts']);
      return {
        content: [{ type: 'text', text: components.join('\n') }],
      };
    }
    
    if (name === 'read_service') {
      const servicePath = join('src/services', `${args.service}.ts`);
      const content = readFile(servicePath);
      return {
        content: [{ type: 'text', text: content }],
      };
    }
    
    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Demeter MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
