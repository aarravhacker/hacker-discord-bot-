module.exports = {
  nodes: [
    {
      name: 'Main',
      url: `${process.env.LAVALINK_HOST || 'localhost'}:${process.env.LAVALINK_PORT || 2333}`,
      auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
      secure: process.env.LAVALINK_SECURE === 'true'
    }
  ],
  defaultSearchEngine: 'youtube',
  retryTimeout: 30000,
  retryCount: 5
};
