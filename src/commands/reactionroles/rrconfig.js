const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild, updateGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rrconfig')
    .setDescription('Configure reaction roles (short alias)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable/disable'))
    .addChannelOption(opt => opt.setName('logchannel').setDescription('Log channel')),
  cooldown: 5,
  aliases: ['reactionroleconfig'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
            const guild = await getGuild(interaction.guild.id);
            const data = guild.reaction_role_config || {};

            if (isSlash) {
              const enabled = interaction.options?.getBoolean('enabled');
              const logChannel = interaction.options?.getChannel('logchannel');
              if (enabled !== null) data.enabled = enabled;
              if (logChannel) data.log_channel = logChannel.id;
            } else {
              for (let i = 0; i < (args?.length || 0) - 1; i += 2) {
                const key = args[i].toLowerCase();
                const value = args[i + 1];
                if (key === 'enabled') data.enabled = value === 'true';
                else if (key === 'logchannel' || key === 'log') data.log_channel = value.replace(/[<>#]/g, '');
              }
            }

            await updateGuild(interaction.guild.id, { reaction_role_config: data });

            return interaction.reply({ embeds: [successEmbed('Config Updated', `Enabled: ${data.enabled !== false ? 'Yes' : 'No'}\nLog Channel: ${data.log_channel ? `<#${data.log_channel}>` : 'Not set'}`)] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};
