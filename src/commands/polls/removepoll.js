const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removepoll')
    .setDescription('Remove a poll (alias)')
    .addStringOption(opt => opt.setName('messageid').setDescription('Poll message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./deletepoll');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};