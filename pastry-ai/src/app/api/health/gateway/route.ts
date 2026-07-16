export async function GET(): Promise<Response> {
  return Response.json({
    checks: {
      aiGatewayConfigured: Boolean(process.env.INTERNAL_AI_GATEWAY_URL),
      internalSecretConfigured: Boolean(process.env.INTERNAL_API_SHARED_SECRET),
    },
    status: "ok",
  });
}
