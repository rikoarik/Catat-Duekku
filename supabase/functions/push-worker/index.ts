import { createClient } from 'npm:@supabase/supabase-js@2.110.7';

type Delivery = { id: number; token: string; title: string; message: string; url: string };
type Ticket = { status?: string; id?: string; message?: string; details?: { error?: string } };

Deno.serve(async (req) => {
  const workerSecret = Deno.env.get('PUSH_WORKER_SECRET');
  if (req.method !== 'POST' || !workerSecret || req.headers.get('authorization') !== `Bearer ${workerSecret}`) return new Response(null, { status: 401 });
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return new Response(null, { status: 503 });
  const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const claimed = await client.rpc('claim_notification_deliveries', { p_limit: 100 });
  if (claimed.error) return Response.json({ error: 'claim_failed' }, { status: 503 });
  const deliveries = claimed.data as Delivery[];
  if (!deliveries.length) return Response.json({ processed: 0 });
  let response: Response;
  try {
    response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json', ...(Deno.env.get('EXPO_ACCESS_TOKEN') ? { authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` } : {}) },
      body: JSON.stringify(deliveries.map((delivery) => ({ to: delivery.token, title: delivery.title, body: delivery.message, sound: 'default', channelId: 'keuangan', data: { url: delivery.url } }))),
    });
  } catch {
    await Promise.all(deliveries.map(({ id }) => client.rpc('complete_notification_delivery', { p_id: id, p_error: 'provider_unavailable' })));
    return Response.json({ error: 'provider_unavailable' }, { status: 503 });
  }
  if (!response.ok) {
    await Promise.all(deliveries.map(({ id }) => client.rpc('complete_notification_delivery', { p_id: id, p_error: `provider_http_${response.status}` })));
    return Response.json({ error: 'provider_unavailable' }, { status: 503 });
  }
  const envelope = await response.json() as { data?: Ticket[] };
  const tickets = Array.isArray(envelope.data) ? envelope.data : [];
  await Promise.all(deliveries.map(async ({ id, token }, index) => {
    const ticket = tickets[index];
    const providerError = ticket?.details?.error;
    const permanent = providerError === 'DeviceNotRegistered';
    if (permanent) await client.from('push_tokens').delete().eq('token', token);
    return client.rpc('complete_notification_delivery', { p_id: id, p_ticket_id: ticket?.id ?? null, p_error: ticket?.status === 'ok' ? null : providerError ?? ticket?.message ?? 'invalid_ticket', p_permanent: permanent });
  }));
  return Response.json({ processed: deliveries.length, accepted: tickets.filter((ticket) => ticket.status === 'ok').length });
});
