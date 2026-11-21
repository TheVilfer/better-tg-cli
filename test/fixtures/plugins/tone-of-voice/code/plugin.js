export const commands = {
  async collect({ limit, types = ['private'], cursor }, host) {
    // The host bounds the page by size; the agent asks again with `cursor` and `limit = remaining`
    const page = await host.messages.mine({ limit, types, cursor });
    return { messages: page.messages, cursor: page.cursor, remaining: limit - page.count, done: page.done };
  },
};
