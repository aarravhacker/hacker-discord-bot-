const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messagelogignore')
    .setDescription('Add or remove a channel from the message log ignore list')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to ignore/unignore').setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['msglogignore'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || (args && args[0] ? interaction.guild.channels.cache.get(args[0]) : null);
            if (!channel) {
              return interaction.reply({ embeds: [errorEmbed('No Channel', 'Please provide a channel.')] });
            }

            const guild = await getGuild(interaction.guildId);
            const ignored = guild.messageLogIgnored || [];
            const index = ignored.indexOf(channel.id);

            if (index > -1) {
              ignored.splice(index, 1);
              await updateGuild(interaction.guildId, { messageLogIgnored: ignored });
              await interaction.reply({ embeds: [successEmbed('Channel Unignored', `Removed <#${channel.id}> from the ignore list.`)] });
            } else {
              ignored.push(channel.id);
              await updateGuild(interaction.guildId, { messageLogIgnored: ignored });
              await interaction.reply({ embeds: [successEmbed('Channel Ignored', `Added <#${channel.id}> to the ignore list.`)] });
            }
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};