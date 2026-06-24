const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memberlogconfig')
    .setDescription('Configure member logging settings')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to log member events').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_joins').setDescription('Log member joins').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_leaves').setDescription('Log member leaves').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_bans').setDescription('Log bans').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_kicks').setDescription('Log kicks').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_roles').setDescription('Log role changes').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_nicknames').setDescription('Log nickname changes').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['memlogconfig'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel');
            const logJoins = interaction.options?.getBoolean('log_joins');
            const logLeaves = interaction.options?.getBoolean('log_leaves');
            const logBans = interaction.options?.getBoolean('log_bans');
            const logKicks = interaction.options?.getBoolean('log_kicks');
            const logRoles = interaction.options?.getBoolean('log_roles');
            const logNicks = interaction.options?.getBoolean('log_nicknames');

            const update = {};
            if (channel) {
              if (channel.type !== ChannelType.GuildText) {
                return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Please select a text channel.')] });
              }
              update.memberLogChannel = channel.id;
            }
            if (logJoins !== null && logJoins !== undefined) update.memberLogJoins = logJoins;
            if (logLeaves !== null && logLeaves !== undefined) update.memberLogLeaves = logLeaves;
            if (logBans !== null && logBans !== undefined) update.memberLogBans = logBans;
            if (logKicks !== null && logKicks !== undefined) update.memberLogKicks = logKicks;
            if (logRoles !== null && logRoles !== undefined) update.memberLogRoles = logRoles;
            if (logNicks !== null && logNicks !== undefined) update.memberLogNicks = logNicks;

            if (Object.keys(update).length === 0) {
              const guild = await getGuild(interaction.guildId);
              const embed = infoEmbed('Member Log Config', [
                `**Channel:** ${guild.memberLogChannel ? `<#${guild.memberLogChannel}>` : 'Not set'}`,
                `**Log Joins:** ${guild.memberLogJoins ? 'Yes' : 'No'}`,
                `**Log Leaves:** ${guild.memberLogLeaves ? 'Yes' : 'No'}`,
                `**Log Bans:** ${guild.memberLogBans ? 'Yes' : 'No'}`,
                `**Log Kicks:** ${guild.memberLogKicks ? 'Yes' : 'No'}`,
                `**Log Roles:** ${guild.memberLogRoles ? 'Yes' : 'No'}`,
                `**Log Nicknames:** ${guild.memberLogNicks ? 'Yes' : 'No'}`
              ].join('\n'));
              return interaction.reply({ embeds: [embed] });
            }

            await updateGuild(interaction.guildId, update);
            await interaction.reply({ embeds: [successEmbed('Config Updated', 'Member log configuration has been updated.')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};