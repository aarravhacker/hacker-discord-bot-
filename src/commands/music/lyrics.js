const { SlashCommandBuilder } = require('discord.js');
const { getShoukaku, isSlashCommand, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lyrics')
    .setDescription('Get lyrics for the current or a specified song')
    .addStringOption(opt => opt.setName('query').setDescription('Song to search lyrics for')),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    const shoukaku = getShoukaku();

    let query;
    if (isSlash) {
      query = interaction.options?.getString('query');
    } else {
      query = args?.join(' ');
    }

    if (!query) {
      if (!shoukaku) return interaction.reply({ content: '❌ Music system not connected!' });
      const player = shoukaku.players.get(interaction.guild.id);
      if (!player) return interaction.reply({ content: '❌ Nothing is playing! Provide a song name.' });
      const queue = getQueue(interaction.guild.id);
      const track = queue.current;
      if (!track) return interaction.reply({ content: '❌ Nothing is currently playing!' });
      query = track.info?.title || 'Unknown';
    }

    if (isSlash) {
      await interaction.deferReply();
    }

    try {
      const fetch = globalThis.fetch || (await import('node-fetch')).default;
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(query)}`);
      if (!res.ok) {
        if (isSlash) return interaction.editReply(`❌ No lyrics found for **${query}**.`);
        return interaction.reply(`❌ No lyrics found for **${query}**.`);
      }
      const data = await res.json();
      const lyrics = data.lyrics;
      if (!lyrics) {
        if (isSlash) return interaction.editReply(`❌ No lyrics found for **${query}**.`);
        return interaction.reply(`❌ No lyrics found for **${query}**.`);
      }

      const chunks = lyrics.match(/.{1,1900}/gs) || [];
      const title = data.title || query;
      const artist = data.artist || '';

      const embed = {
        title: `📜 ${artist} - ${title}`,
        description: chunks[0] + (chunks.length > 1 ? '\n\n*... (lyrics too long, truncated)*' : ''),
        color: 0x1db954
      };

      if (isSlash) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      if (isSlash) {
        await interaction.editReply(`❌ Error fetching lyrics for **${query}**.`);
      } else {
        await interaction.reply(`❌ Error fetching lyrics for **${query}**.`);
      }
    }
  }
};
