import { NextResponse } from "next/server";

import {
  getMcpMetadata,
  handleJsonRpcRequest,
  jsonRpcError,
  type JsonRpcRequest,
} from "@/lib/mcp-jsonrpc";

export async function GET() {
  return NextResponse.json(getMcpMetadata("http"));
}

export async function POST(request: Request) {
  let payload: JsonRpcRequest;

  try {
    payload = (await request.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json(jsonRpcError(null, -32700, "Invalid JSON payload."));
  }

  return NextResponse.json(await handleJsonRpcRequest(payload));
}
