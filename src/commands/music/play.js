const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getShoukaku, getNode, formatDuration, getMember, getUser, isSlashCommand, searchTrack, joinVoiceChannel, playTrack, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from YouTube')
    .addStringOption(opt => opt.setName('query').setDescription('Song name or URL').setRequired(true)),
  cooldown: 3,
  aliases: ['p'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    const query = isSlash ? interaction.options?.getString('query') : args?.join(' ');
    const member = getMember(interaction, isSlash);
    const user = getUser(interaction, isSlash);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: 'You must be in a voice channel!' });
    }

    if (!query) {
      return interaction.reply({ content: 'Please provide a song name or URL!' });
    }

    if (!getShoukaku()) {
      return interaction.reply({ content: 'Music system is not initialized!' });
    }

    const searchEmbed = new EmbedBuilder()
      .setColor(0xfee75c)
      .setDescription(`Searching for **${query}**...`)

    let msg;
    if (isSlash) {
      await interaction.deferReply();
      msg = interaction;
    } else {
      msg = await interaction.reply({ embeds: [searchEmbed] });
    }

    try {
      console.log(`[Music] Searching for: ${query}`);
      const tracks = await searchTrack(query);
      console.log(`[Music] Found ${tracks.length} tracks for: ${query}`);
      if (tracks.length === 0) {
        const errContent = `No results found for: ${query}`;
        return isSlash ? interaction.editReply({ content: errContent, embeds: [] }) : msg.edit({ content: errContent, embeds: [] });
      }

      const track = tracks[0];
      const trackInfo = track.info || {};
      const trackTitle = trackInfo.title || 'Unknown Track';
      const trackUri = trackInfo.uri || '';
      const trackDuration = trackInfo.duration || trackInfo.length || 0;
      const trackAuthor = trackInfo.author || 'Unknown';

      const queue = getQueue(interaction.guild.id);
      const hasTracks = queue.current || queue.length > 0;

      if (!hasTracks) {
        await joinVoiceChannel(interaction.guild, voiceChannel);
        await playTrack(interaction.guild.id, track);

        const embed = new EmbedBuilder()
          .setTitle('Now Playing')
          .setDescription(trackUri ? `[${trackTitle}](${trackUri})` : trackTitle)
          .setColor(0x1db954)
          .addFields(
            { name: 'Duration', value: formatDuration(trackDuration), inline: true },
            { name: 'Author', value: trackAuthor, inline: true },
            { name: 'Requested by', value: user.tag || user.username, inline: true }
          )
          .setFooter({ text: 'Hacker Bot - Music' })
          .setTimestamp();

        if (isSlash) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await msg.edit({ embeds: [embed] });
        }
      } else {
        queue.add(track);

        const embed = new EmbedBuilder()
          .setTitle('Added to Queue')
          .setDescription(trackUri ? `[${trackTitle}](${trackUri})` : trackTitle)
          .setColor(0x1db954)
          .addFields(
            { name: 'Position', value: `#${queue.length}`, inline: true },
            { name: 'Duration', value: formatDuration(trackDuration), inline: true },
            { name: 'Requested by', value: user.tag || user.username, inline: true }
          )
          .setFooter({ text: 'Hacker Bot - Music' })
          .setTimestamp();

        if (isSlash) {
          await interaction.editReply({ embeds: [embed] });
        } else {
          await msg.edit({ embeds: [embed] });
        }
      }
    } catch (error) {
      console.error('Play command error:', error);
      const errContent = `Error: ${error.message || 'Unknown error'}`;
      try {
        if (isSlash) {
          await interaction.editReply({ content: errContent, embeds: [] });
        } else {
          await msg.edit({ content: errContent, embeds: [] });
        }
      } catch (e) {}
    }
  }
};
