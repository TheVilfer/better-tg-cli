import { WorkerEntrypoint } from 'cloudflare:workers';

// Test stand-in for the Email Sending binding: the relay calls `env.EMAIL.send()` over RPC, and the
// test reads what was "sent" with a GET.
const mails: unknown[] = [];

export default class MailCapture extends WorkerEntrypoint {
  async send(message: unknown) {
    mails.push(message);
    return { messageId: `test-${mails.length}` };
  }
  async fetch() {
    return Response.json(mails);
  }
}
