import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { createMcpServer, handleMcpRequest } from './mcpServer'
import { mcpTools } from './mcpTools/registry'
import type { McpToolDef } from './mcpTools/types'

const ctx = { redmineUrl: 'http://r', headers: {} }

const post = (body: unknown) =>
  new Request('http://localhost/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify(body),
  })

const rpc = async (method: string, params?: unknown) => {
  const res = await handleMcpRequest(post({ jsonrpc: '2.0', id: 1, method, params }), ctx)
  return { res, json: await res.json() as any }
}

describe('MCP wire behaviour (stateless Streamable HTTP)', () => {
  it('answers initialize without issuing a session id', async () => {
    const { res, json } = await rpc('initialize', {
      protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 't', version: '1' },
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('mcp-session-id')).toBeNull()
    expect(json.result.serverInfo.name).toBe('redmine-client')
  })

  it('lists exactly the registry tools with their schemas', async () => {
    const { json } = await rpc('tools/list')
    const names = json.result.tools.map((t: any) => t.name).sort()
    expect(names).toEqual(mcpTools.map(t => t.name).sort())
    const byVersion = json.result.tools.find((t: any) => t.name === 'get_issues_by_version')
    expect(byVersion.inputSchema.type).toBe('object')
    expect(byVersion.description.length).toBeGreaterThan(20)
  })

  it('turns a failing tool call into an isError result, not a protocol error', async () => {
    // get_thisweek_releases requires projectId: invalid input must be reported, not thrown
    const { res, json } = await rpc('tools/call', { name: 'get_thisweek_releases', arguments: {} })
    expect(res.status).toBe(200)
    expect(json.error ?? json.result.isError).toBeTruthy()
  })

  it('answers 405 to GET and DELETE', async () => {
    for (const method of ['GET', 'DELETE']) {
      const res = await handleMcpRequest(new Request('http://localhost/api/mcp', { method }), ctx)
      expect(res.status, method).toBe(405)
      expect(res.headers.get('allow')).toBe('POST')
    }
  })

  it('keeps no state between requests: a second POST works without any session header', async () => {
    const a = await rpc('tools/list')
    const b = await rpc('tools/list')
    expect(a.res.status).toBe(200)
    expect(b.res.status).toBe(200)
  })
})

describe('createMcpServer tool wrapper', () => {
  const callVia = async (tool: McpToolDef, args: unknown) => {
    const server = createMcpServer(ctx, [tool])
    const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js')
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js')
    const [a, b] = InMemoryTransport.createLinkedPair()
    const client = new Client({ name: 't', version: '1' })
    await Promise.all([server.connect(a), client.connect(b)])
    try {
      return await client.callTool({ name: tool.name, arguments: args as any }) as any
    } finally {
      await client.close()
    }
  }

  it('passes validated args and the context to the handler and returns JSON text', async () => {
    const handler = vi.fn(async (args: unknown) => ({ echoed: args }))
    const tool: McpToolDef = { name: 'echo', description: 'echo the input back', inputSchema: { n: z.number() }, handler }
    const result = await callVia(tool, { n: 3 })
    expect(handler).toHaveBeenCalledWith({ n: 3 }, ctx)
    expect(JSON.parse(result.content[0].text)).toEqual({ echoed: { n: 3 } })
    expect(result.isError).toBeFalsy()
  })

  it('reports handler failures as isError with only the message', async () => {
    const tool: McpToolDef = {
      name: 'boom', description: 'always fails with an error',
      inputSchema: {}, handler: async () => { throw Object.assign(new Error('Issue 9 not found'), { config: { headers: { secret: 'x' } } }) },
    }
    const result = await callVia(tool, {})
    expect(result.isError).toBe(true)
    expect(result.content[0].text).toBe('Error: Issue 9 not found')
    expect(JSON.stringify(result)).not.toContain('secret')
  })
})
