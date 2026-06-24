const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reactionrolelog')
    .setDescription('Set or view the reaction role log channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt => opt.setName('channel').setDescription('Log channel (leave empty to view)')),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const channel = isSlash ? interaction.options?.getChannel('channel') : (args?.[0] ? interaction.guild.channels.cache.get(args[0].replace(/[<>#]/g, '')) : null);
            const guild = await getGuild(interaction.guild.id);
            const config = guild.reaction_role_config || {};

            if (channel) {
              if (!channel.isTextBased()) return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Must be a text channel.')] });
              config.log_channel = channel.id;
              await updateGuild(interaction.guild.id, { reaction_role_config: config });
              return interaction.reply({ embeds: [successEmbed('Log Channel Set', `Reaction role logs will be sent to ${channel}.`)] });
            }

            return interaction.reply({ embeds: [infoEmbed('Reaction Role Log', `Current log channel: ${config.log_channel ? `<#${config.log_channel}>` : 'Not set'}`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
