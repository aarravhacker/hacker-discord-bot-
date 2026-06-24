const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Rob another user')
    .addUserOption(opt => opt.setName('user').setDescription('User to rob').setRequired(true)),
  cooldown: 120,
  aliases: ['steal'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const target = interaction.options?.getUser('user') || (args[0] ? interaction.guild.members.cache.get(args[0])?.user : null);
      if (!target) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /rob <user>')] });
      }

      if (target.id === user.id) {
        return interaction.reply({ embeds: [errorEmbed('You cannot rob yourself.')] });
      }

      if (target.bot) {
        return interaction.reply({ embeds: [errorEmbed('You cannot rob bots.')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      const targetData = await getUser(target.id, interaction.guild.id);

      const lastRob = userData.last_rob || 0;
      const now = Date.now();
      if (now - lastRob < 120000) {
        const remaining = Math.ceil((120000 - (now - lastRob)) / 1000);
        return interaction.reply({ embeds: [errorEmbed(`You need to wait **${remaining}** seconds before robbing again.`)] });
      }

      const targetBalance = targetData.balance || 0;
      if (targetBalance < 100) {
        return interaction.reply({ embeds: [errorEmbed('That user is too poor to rob.')] });
      }

      const success = Math.random() < 0.4;

      if (success) {
        const stolen = Math.floor(Math.random() * (targetBalance * 0.3)) + 1;
        await updateUser(user.id, interaction.guild.id, {
          balance: (userData.balance || 0) + stolen,
          last_rob: now
        });
        await updateUser(target.id, interaction.guild.id, {
          balance: targetBalance - stolen
        });
        await interaction.reply({ embeds: [successEmbed(`You successfully robbed **$${formatNumber(stolen)}** from ${target.tag}!`)] });
      } else {
        const fine = Math.floor((userData.balance || 0) * 0.2);
        await updateUser(user.id, interaction.guild.id, {
          balance: Math.max(0, (userData.balance || 0) - fine),
          last_rob: now
        });
        await interaction.reply({ embeds: [errorEmbed(`You failed to rob ${target.tag} and lost **$${formatNumber(fine)}** as a fine!`)] });
      }
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to rob.')] });
    }
  }
};
