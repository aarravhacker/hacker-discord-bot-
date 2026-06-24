const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('greroll')
    .setDescription('Reroll a giveaway winner (alias)')
    .addStringOption(opt => opt.setName('messageid').setDescription('Giveaway message ID').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
      try {
            const parentCommand = require('./giveawayreroll');
            return parentCommand.execute(interaction, args);
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};