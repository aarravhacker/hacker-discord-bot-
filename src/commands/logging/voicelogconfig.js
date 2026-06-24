const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicelogconfig')
    .setDescription('Configure voice logging settings')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to log voice events').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_joins').setDescription('Log voice joins').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_leaves').setDescription('Log voice leaves').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_moves').setDescription('Log channel moves').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_mutes').setDescription('Log mute/unmute events').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['vclogconfig'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel');
            const logJoins = interaction.options?.getBoolean('log_joins');
            const logLeaves = interaction.options?.getBoolean('log_leaves');
            const logMoves = interaction.options?.getBoolean('log_moves');
            const logMutes = interaction.options?.getBoolean('log_mutes');

            const update = {};
            if (channel) {
              if (channel.type !== ChannelType.GuildText) {
                return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Please select a text channel.')] });
              }
              update.voiceLogChannel = channel.id;
            }
            if (logJoins !== null && logJoins !== undefined) update.voiceLogJoins = logJoins;
            if (logLeaves !== null && logLeaves !== undefined) update.voiceLogLeaves = logLeaves;
            if (logMoves !== null && logMoves !== undefined) update.voiceLogMoves = logMoves;
            if (logMutes !== null && logMutes !== undefined) update.voiceLogMutes = logMutes;

            if (Object.keys(update).length === 0) {
              const guild = await getGuild(interaction.guildId);
              const embed = infoEmbed('Voice Log Config', [
                `**Channel:** ${guild.voiceLogChannel ? `<#${guild.voiceLogChannel}>` : 'Not set'}`,
                `**Log Joins:** ${guild.voiceLogJoins ? 'Yes' : 'No'}`,
                `**Log Leaves:** ${guild.voiceLogLeaves ? 'Yes' : 'No'}`,
                `**Log Moves:** ${guild.voiceLogMoves ? 'Yes' : 'No'}`,
                `**Log Mutes:** ${guild.voiceLogMutes ? 'Yes' : 'No'}`
              ].join('\n'));
              return interaction.reply({ embeds: [embed] });
            }

            await updateGuild(interaction.guildId, update);
            await interaction.reply({ embeds: [successEmbed('Config Updated', 'Voice log configuration has been updated.')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};