const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { infoEmbed, errorEmbed } = require('../../utils/helpers');
const { getGuild } = require('../../db/guildRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverconfig')
    .setDescription('View full server configuration details')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['guildconfig', 'scfg'],
  prefix: true,
  adminOnly: true,
  async execute(interaction) {
      try {
            const guildData = await getGuild(interaction.guild.id);

            const embed = infoEmbed('**Server Configuration**')
              .addFields(
                { name: 'Settings', value: [
                  `Prefix: \`${guildData.prefix || '!'}\``,
                  `Auto-Role: ${guildData.autoRoleId ? `<@&${guildData.autoRoleId}>` : 'Not set'}`,
                  `Mute Role: ${guildData.muteRoleId ? `<@&${guildData.muteRoleId}>` : 'Not set'}`
                ].join('\n'), inline: false },
                { name: 'Channels', value: [
                  `Welcome: ${guildData.welcomeChannelId ? `<#${guildData.welcomeChannelId}>` : 'Not set'}`,
                  `Goodbye: ${guildData.goodbyeChannelId ? `<#${guildData.goodbyeChannelId}>` : 'Not set'}`,
                  `Log: ${guildData.logChannelId ? `<#${guildData.logChannelId}>` : 'Not set'}`,
                  `Starboard: ${guildData.starboardChannelId ? `<#${guildData.starboardChannelId}>` : 'Not set'}`,
                  `Level Up: ${guildData.levelUpChannelId ? `<#${guildData.levelUpChannelId}>` : 'Not set'}`,
                  `Boost: ${guildData.boostChannelId ? `<#${guildData.boostChannelId}>` : 'Not set'}`,
                  `Rules: ${guildData.rulesChannelId ? `<#${guildData.rulesChannelId}>` : 'Not set'}`
                ].join('\n'), inline: false },
                { name: 'Messages', value: [
                  `Welcome: ${(guildData.welcomeMessage || 'Default').slice(0, 100)}`,
                  `Goodbye: ${(guildData.goodbyeMessage || 'Default').slice(0, 100)}`,
                  `Boost: ${(guildData.boostMessage || 'Default').slice(0, 100)}`
                ].join('\n'), inline: false },
                { name: 'Moderation', value: [
                  `AutoMod: ${guildData.autoMod ? 'Enabled' : 'Disabled'}`,
                  `Max Warns: ${guildData.maxWarns || 5}`,
                  `Locked Roles: ${(guildData.lockedRoles || []).length}`
                ].join('\n'), inline: false },
                { name: 'Leveling', value: [
                  `XP Rate: ${guildData.xpRate || 1}x`,
                  `Level Up Message: ${guildData.levelUpMessage || 'Default'}`
                ].join('\n'), inline: false }
              );

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          await interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};