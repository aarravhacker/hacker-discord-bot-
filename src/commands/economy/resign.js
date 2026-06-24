const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resign')
    .setDescription('Resign from your job'),
  cooldown: 300,
  aliases: [],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const userData = await getUser(user.id, interaction.guild.id);
      if (!userData.job) {
        return interaction.reply({ embeds: [errorEmbed('You don\'t have a job to resign from.')] });
      }

      await updateUser(user.id, interaction.guild.id, { job: null });

      await interaction.reply({ embeds: [successEmbed('You have resigned from your job.')] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to resign.')] });
    }
  }
};
