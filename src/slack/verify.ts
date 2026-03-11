export async function verifySlackRequest(
  request: Request,
  signingSecret: string,
  body: string,
): Promise<boolean> {
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');

  if (!timestamp || !signature) return false;

  // Reject requests older than 5 minutes
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(timestamp)) > 300) return false;

  const sigBasestring = `v0:${timestamp}:${body}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(signingSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(sigBasestring));
  const digest = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const expectedSignature = `v0=${digest}`;

  return expectedSignature === signature;
}
