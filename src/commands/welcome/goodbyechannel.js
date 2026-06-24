const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getDB } = require('../../db/connection');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('goodbyechannel')
    .setDescription('Set the goodbye message channel')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel for goodbye messages').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['goodbyech'],
  prefix: true,
  async execute(interaction, args) {
    const channel = interaction.options?.getChannel('channel') || (args && args[0] ? interaction.guild.channels.cache.get(args[0]) : null);
    if (!channel) {
      return interaction.reply({ embeds: [errorEmbed('No Channel', 'Please provide a channel.')] });
    }
    if (channel.type !== ChannelType.GuildText) {
      return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Please select a text channel.')] });
    }

    try {
      const db = getDB();
      const existing = await db('goodbye').where({ guild_id: interaction.guildId }).first();
      const config = existing ? JSON.parse(existing.config || '{}') : {};
      config.channel_id = channel.id;

      if (existing) {
        await db('goodbye').where({ guild_id: interaction.guildId }).update({ channel_id: channel.id, config: JSON.stringify(config) });
      } else {
        await db('goodbye').insert({ guild_id: interaction.guildId, enabled: true, channel_id: channel.id, config: JSON.stringify(config) });
      }

      await interaction.reply({ embeds: [successEmbed('Channel Set', `Goodbye channel set to <#${channel.id}>.`)] });
    } catch (err) {
      await interaction.reply({ embeds: [errorEmbed('Error', 'Failed to set goodbye channel.')] });
    }
  }
};
