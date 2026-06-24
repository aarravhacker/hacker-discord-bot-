const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getShoukaku, getNode, formatDuration, getMember, getUser, isSlashCommand, getQuery, searchTrack, joinVoiceChannel, playTrack, getQueue } = require('../../utils/musicManager');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('p')
    .setDescription('Play a song (alias)')
    .addStringOption(opt => opt.setName('query').setDescription('Song name or URL').setRequired(true)),
  cooldown: 3,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = isSlashCommand(interaction);
    const query = getQuery(interaction, args, isSlash);
    const member = getMember(interaction, isSlash);
    const voiceChannel = member?.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: 'You must be in a voice channel!' });
    }

    if (!query) {
      return interaction.reply({ content: 'Please provide a song name or URL!' });
    }

    if (!getShoukaku()) {
      return interaction.reply({ content: 'Music system is not connected!' });
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
      const allTracks = await searchTrack(query);
      if (!allTracks || allTracks.length === 0) {
        const errContent = `No results found for: ${query}`;
        return isSlash ? interaction.editReply({ content: errContent, embeds: [] }) : msg.edit({ content: errContent, embeds: [] });
      }

      const track = allTracks[0];
      const queue = getQueue(interaction.guild.id);
      const hasTracks = queue.current || queue.length > 0;

      if (!hasTracks) {
        await joinVoiceChannel(interaction.guild, voiceChannel);
        await playTrack(interaction.guild.id, track);
        queue.current = track;
      } else {
        queue.add(track);
      }

      const userObj = getUser(interaction, isSlash);
      const trackInfo = track.info || {};
      const trackTitle = trackInfo.title || 'Unknown';
      const trackUri = trackInfo.uri || '';
      const trackDuration = trackInfo.duration || trackInfo.length || 0;
      const trackAuthor = trackInfo.author || 'Unknown';

      const embed = new EmbedBuilder()
        .setTitle(hasTracks ? 'Added to Queue' : 'Now Playing')
        .setDescription(trackUri ? `[${trackTitle}](${trackUri})` : trackTitle)
        .setColor(0x1db954)
        .addFields(
          { name: 'Duration', value: formatDuration(trackDuration), inline: true },
          { name: 'Author', value: trackAuthor, inline: true },
          { name: 'Requested by', value: userObj.tag || userObj.username, inline: true }
        )
        .setFooter({ text: 'Hacker Bot - Music' })
        .setTimestamp();

      if (isSlash) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await msg.edit({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
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
