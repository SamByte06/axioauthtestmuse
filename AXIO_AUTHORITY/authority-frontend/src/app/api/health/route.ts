/** Frontend self health — liveness only. Never exposes backend state. */
export async function GET() {
  return Response.json(
    { service: "authority-frontend", status: "ok", time: new Date().toISOString() },
    { status: 200 },
  );
}
