const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');

const symbols = ['🍒', '🍋', '🍊', '🍇', '🍉', '💎', '7️⃣'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slots')
    .setDescription('Play the slot machine')
    .addIntegerOption(opt => opt.setName('amount').setDescription('Amount to bet').setRequired(true)),
  cooldown: 5,
  aliases: ['slot', 'jackpot', 'casino'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const amount = interaction.options?.getInteger('amount') || parseInt(args[0]);
      if (!amount || amount <= 0) {
        return interaction.reply({ embeds: [errorEmbed('Usage: /slots <amount>')] });
      }

      const userData = await getUser(user.id, interaction.guild.id);
      if ((userData.balance || 0) < amount) {
        return interaction.reply({ embeds: [errorEmbed(`You only have $${formatNumber(userData.balance || 0)}.`)] });
      }

      const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
      const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

      let multiplier = 0;
      if (reel1 === reel2 && reel2 === reel3) {
        if (reel1 === '💎') multiplier = 10;
        else if (reel1 === '7️⃣') multiplier = 7;
        else multiplier = 5;
      } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
        multiplier = 2;
      }

      const winnings = amount * multiplier;
      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) - amount + winnings
      });

      const embed = new EmbedBuilder()
        .setColor(multiplier > 0 ? config.embedColors.success || '#00FF00' : config.embedColors.error || '#FF0000')
        .setTitle('Slot Machine')
        .setDescription(`**[ ${reel1} | ${reel2} | ${reel3} ]**\n\n${multiplier > 0 ? `You won **$${formatNumber(winnings)}**! (${multiplier}x)` : `You lost **$${formatNumber(amount)}**.`}`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to play slots.')] });
    }
  }
};
