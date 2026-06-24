const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('love')
    .setDescription('Calculate love between two users')
    .addUserOption(option =>
      option.setName('user1').setDescription('First user').setRequired(true)
    )
    .addUserOption(option =>
      option.setName('user2').setDescription('Second user').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['love'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const user1 = interaction.options?.getUser('user1') || interaction.mentions?.users?.first();
            const user2 = interaction.options?.getUser('user2') || interaction.mentions?.users?.array()?.[1];

            if (!user1 || !user2) {
              return interaction.reply({ embeds: [errorEmbed('Please mention two users.')] });
            }

            if (user1.id === user2.id) {
              return interaction.reply({ embeds: [errorEmbed('You cannot calculate love with yourself!')] });
            }

            const lovePercent = Math.floor(Math.random() * 101);
            let loveMessage;
            let loveColor;

            if (lovePercent >= 90) {
              loveMessage = '💕 Soulmates! You two are meant to be!';
              loveColor = 0xFF1493;
            } else if (lovePercent >= 70) {
              loveMessage = '💗 There\'s definitely something special here!';
              loveColor = 0xFF69B4;
            } else if (lovePercent >= 50) {
              loveMessage = '💛 There\'s potential here!';
              loveColor = 0xFFD700;
            } else if (lovePercent >= 30) {
              loveMessage = '💔 Maybe just friends?';
              loveColor = 0xFF6347;
            } else {
              loveMessage = '💔 Not meant to be...';
              loveColor = 0x8B0000;
            }

            const embed = successEmbed('Love Calculator')
              .setDescription(`${user1.username} x ${user2.username}`)
              .addField('Love Meter', `${lovePercent}%`)
              .addField('Message', loveMessage)
              .setColor(loveColor);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};