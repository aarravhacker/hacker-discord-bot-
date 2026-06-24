const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('match')
    .setDescription('Match two users together')
    .addUserOption(option =>
      option.setName('user1').setDescription('First user').setRequired(true)
    )
    .addUserOption(option =>
      option.setName('user2').setDescription('Second user').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['match'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const user1 = interaction.options?.getUser('user1') || interaction.mentions?.users?.first();
            const user2 = interaction.options?.getUser('user2') || interaction.mentions?.users?.array()?.[1];

            if (!user1 || !user2) {
              return interaction.reply({ embeds: [errorEmbed('Please mention two users.')] });
            }

            if (user1.id === user2.id) {
              return interaction.reply({ embeds: [errorEmbed('You cannot match a user with themselves!')] });
            }

            const matchPercent = Math.floor(Math.random() * 101);
            let matchResult;
            let matchColor;

            if (matchPercent >= 80) {
              matchResult = '✨ Perfect match! You two complement each other perfectly!';
              matchColor = 0x9B59B6;
            } else if (matchPercent >= 60) {
              matchResult = '💫 Great match! You have a lot in common!';
              matchColor = 0x3498DB;
            } else if (matchPercent >= 40) {
              matchResult = '⭐ Decent match! There\'s some chemistry here.';
              matchColor = 0xF39C12;
            } else if (matchPercent >= 20) {
              matchResult = '🌙 Not the best match, but opposites attract!';
              matchColor = 0xE67E22;
            } else {
              matchResult = '🌑 Terrible match! You two are like oil and water.';
              matchColor = 0x95A5A6;
            }

            const embed = successEmbed('Match Maker')
              .setDescription(`${user1.username} x ${user2.username}`)
              .addField('Match Score', `${matchPercent}%`)
              .addField('Result', matchResult)
              .setColor(matchColor);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};