const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser } = require('../../db/userRepository');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Check your balance')
    .addUserOption(opt => opt.setName('user').setDescription('Check another user\'s balance').setRequired(false)),
  cooldown: 5,
  aliases: ['bal', 'wallet', 'bank'],
  prefix: true,
  async execute(interaction, args) {
    try {
      const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
      let user;
      if (isSlash) {
        user = interaction.options?.getUser('user') || interaction.user;
      } else {
        const userId = args?.[0]?.replace(/[<>@!]/g, '');
        user = userId ? await interaction.client.users.fetch(userId).catch(() => interaction.author) : interaction.author;
      }

      const userData = await getUser(user.id, interaction.guild.id);

      const balance = userData.balance || 0;
      const bank = userData.bank || 0;
      const total = balance + bank;

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.economy || '#FFD700')
        .setTitle(`${user.tag}'s Balance`)
        .setThumbnail(user.displayAvatarURL())
        .addFields(
          { name: 'Wallet', value: `$${formatNumber(balance)}`, inline: true },
          { name: 'Bank', value: `$${formatNumber(bank)}`, inline: true },
          { name: 'Total', value: `$${formatNumber(total)}`, inline: true }
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to fetch balance.')] });
    }
  }
};
