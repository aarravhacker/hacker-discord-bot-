const { SlashCommandBuilder } = require('discord.js');
const { getShoukaku, getNode, formatDuration, getMember, getUser, isSlashCommand, getQuery, searchTrack, joinVoiceChannel, playTrack, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('search')
    .setDescription('Search for songs and pick one to play')
    .addStringOption(opt => opt.setName('query').setDescription('Search query').setRequired(true)),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    const query = getQuery(interaction, args, isSlash);
    const member = getMember(interaction, isSlash);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You must be in a voice channel!' });
    }

    const shoukaku = getShoukaku();
    if (!shoukaku) return interaction.reply({ content: '❌ Music system not connected!' });

    if (isSlash) {
      await interaction.deferReply();
    }

    try {
      const allTracks = await searchTrack(query);
      if (!allTracks || allTracks.length === 0) {
        if (isSlash) return interaction.editReply('❌ No results found!');
        return interaction.reply('❌ No results found!');
      }

      const tracks = allTracks.slice(0, 5);

      let description = '';
      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        description += `**${i + 1}.** [${t.info.title}](${t.info.uri}) - ${formatDuration(t.info.duration)}\n`;
      }

      const embed = {
        title: `🔍 Search Results for: ${query}`,
        description,
        color: 0x1db954,
        footer: { text: 'Reply with a number (1-5) to select a track' }
      };

      let sentMsg;
      if (isSlash) {
        sentMsg = await interaction.editReply({ embeds: [embed] });
      } else {
        sentMsg = await interaction.reply({ embeds: [embed] });
      }

      const filter = m => {
        const userId = isSlash ? interaction.user.id : interaction.author.id;
        return m.author.id === userId && /^[1-5]$/.test(m.content.trim());
      };

      const collected = await interaction.channel?.awaitMessages({
        filter,
        max: 1,
        time: 30000,
        errors: ['time']
      }).catch(() => null);

      if (!collected || collected.size === 0) {
        if (isSlash) return interaction.editReply({ content: '❌ Timed out waiting for selection.', embeds: [] });
        return interaction.reply({ content: '❌ Timed out waiting for selection.' });
      }

      const choice = parseInt(collected.first().content.trim()) - 1;
      const selectedTrack = tracks[choice];

      const queue = getQueue(interaction.guild.id);
      const hasTracks = queue.current;

      if (!hasTracks) {
        await joinVoiceChannel(interaction.guild, voiceChannel);
        await playTrack(interaction.guild.id, selectedTrack);
        queue.current = selectedTrack;
      } else {
        queue.add(selectedTrack);
      }

      const userObj = getUser(interaction, isSlash);
      const playEmbed = {
        title: '🎵 Now Playing',
        description: `[${selectedTrack.info.title}](${selectedTrack.info.uri})`,
        color: 0x1db954,
        fields: [
          { name: 'Duration', value: formatDuration(selectedTrack.info.duration), inline: true },
          { name: 'Author', value: selectedTrack.info.author || 'Unknown', inline: true },
          { name: 'Requested by', value: userObj.tag || userObj.username, inline: true }
        ]
      };

      if (isSlash) {
        await interaction.editReply({ embeds: [playEmbed] });
      } else {
        await interaction.reply({ embeds: [playEmbed] });
      }
    } catch (error) {
      console.error(error);
      if (isSlash) {
        await interaction.editReply('❌ Error searching: ' + error.message);
      } else {
        await interaction.reply('❌ Error searching: ' + error.message);
      }
    }
  }
};
