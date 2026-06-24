const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getGuild, updateGuild } = require('../../db/guildRepository');
const { successEmbed, errorEmbed, infoEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('messagelogconfig')
    .setDescription('Configure message logging settings')
    .addChannelOption(opt =>
      opt.setName('channel').setDescription('Channel to log messages to').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_deletes').setDescription('Log deleted messages').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_edits').setDescription('Log edited messages').setRequired(false)
    )
    .addBooleanOption(opt =>
      opt.setName('log_images').setDescription('Log image attachments').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['msglogconfig'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const channel = interaction.options?.getChannel('channel') || (args && args[0] ? interaction.guild.channels.cache.get(args[0]) : null);
            const logDeletes = interaction.options?.getBoolean('log_deletes');
            const logEdits = interaction.options?.getBoolean('log_edits');
            const logImages = interaction.options?.getBoolean('log_images');

            const update = {};
            if (channel) {
              if (channel.type !== ChannelType.GuildText) {
                return interaction.reply({ embeds: [errorEmbed('Invalid Channel', 'Please select a text channel.')] });
              }
              update.messageLogChannel = channel.id;
            }
            if (logDeletes !== null && logDeletes !== undefined) update.messageLogDeletes = logDeletes;
            if (logEdits !== null && logEdits !== undefined) update.messageLogEdits = logEdits;
            if (logImages !== null && logImages !== undefined) update.messageLogImages = logImages;

            if (Object.keys(update).length === 0) {
              const guild = await getGuild(interaction.guildId);
              const embed = infoEmbed('Message Log Config', [
                `**Channel:** ${guild.messageLogChannel ? `<#${guild.messageLogChannel}>` : 'Not set'}`,
                `**Log Deletes:** ${guild.messageLogDeletes ? 'Yes' : 'No'}`,
                `**Log Edits:** ${guild.messageLogEdits ? 'Yes' : 'No'}`,
                `**Log Images:** ${guild.messageLogImages ? 'Yes' : 'No'}`
              ].join('\n'));
              return interaction.reply({ embeds: [embed] });
            }

            await updateGuild(interaction.guildId, update);
            await interaction.reply({ embeds: [successEmbed('Config Updated', 'Message log configuration has been updated.')] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};