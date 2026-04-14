import { NextResponse } from "next/server";

import { loadInstallContract } from "@/lib/product-surface";

export function GET() {
  return NextResponse.json(loadInstallContract());
}
