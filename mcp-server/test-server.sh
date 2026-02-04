#!/bin/bash
# Test script for Demeter MCP Server

echo "Testing Demeter MCP Server..."
echo ""

# Test 1: List resources
echo "=== Test 1: List resources ==="
echo '{"jsonrpc": "2.0", "id": 1, "method": "resources/list"}' | node index.js 2>/dev/null | jq '.'

echo ""
echo "=== Test 2: List tools ==="
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/list"}' | node index.js 2>/dev/null | jq '.'

echo ""
echo "=== Test 3: List components ==="
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "list_components", "arguments": {}}}' | node index.js 2>/dev/null | jq '.'

echo ""
echo "Done!"
