const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcclean')
    .setDescription('Delete all empty temp voice channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const db = getDB();
    const guildId = interaction.guildId;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTimestamp();

    const tempChannels = await db('temp_channels').where({ guild_id: guildId });
    let deleted = 0;

    for (const tc of tempChannels) {
      const channel = interaction.guild.channels.cache.get(tc.channel_id);
      if (!channel) {
        await db('temp_channels').where({ guild_id: guildId, channel_id: tc.channel_id }).del();
        deleted++;
        continue;
      }
      if (channel.members.size === 0) {
        try {
          await channel.delete('VC Clean - empty channel');
          await db('temp_channels').where({ guild_id: guildId, channel_id: tc.channel_id }).del();
          deleted++;
        } catch (err) {
          // skip channels that can't be deleted
        }
      }
    }

    embed
      .setTitle('VC Clean')
      .setDescription(`Deleted **${deleted}** empty temp voice channel${deleted !== 1 ? 's' : ''}.`)
      .setColor(0x57F287);

    return interaction.reply({ embeds: [embed] });
  },
  adminOnly: true
};
