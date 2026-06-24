const { SlashCommandBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Ship two users together')
    .addUserOption(option =>
      option.setName('user1').setDescription('First user').setRequired(true)
    )
    .addUserOption(option =>
      option.setName('user2').setDescription('Second user').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['ship'],
  prefix: true,
  async execute(interaction, args) {
      try {
            const user1 = interaction.options?.getUser('user1') || interaction.mentions?.users?.first();
            const user2 = interaction.options?.getUser('user2') || interaction.mentions?.users?.array()?.[1];

            if (!user1 || !user2) {
              return interaction.reply({ embeds: [errorEmbed('Please mention two users.')] });
            }

            if (user1.id === user2.id) {
              return interaction.reply({ embeds: [errorEmbed('You cannot ship a user with themselves!')] });
            }

            const shipPercent = Math.floor(Math.random() * 101);
            let shipLevel;
            let shipColor;

            if (shipPercent >= 80) {
              shipLevel = '💕 Perfect Match!';
              shipColor = 0xFF1493;
            } else if (shipPercent >= 60) {
              shipLevel = '💗 Great Match!';
              shipColor = 0xFF69B4;
            } else if (shipPercent >= 40) {
              shipLevel = '💛 Good Match';
              shipColor = 0xFFD700;
            } else if (shipPercent >= 20) {
              shipLevel = '💔 Not Great...';
              shipColor = 0xFF6347;
            } else {
              shipLevel = '💔 Terrible Match';
              shipColor = 0x8B0000;
            }

            const barLength = 20;
            const filled = Math.floor((shipPercent / 100) * barLength);
            const empty = barLength - filled;
            const progressBar = '❤️'.repeat(filled) + '🖤'.repeat(empty);

            const embed = successEmbed('Love Ship')
              .setDescription(`${user1.username} x ${user2.username}`)
              .addField('Compatibility', `${shipPercent}%`)
              .addField('Progress', progressBar)
              .addField('Status', shipLevel)
              .setColor(shipColor);

            return interaction.reply({ embeds: [embed] });
      } catch (err) {
          interaction.reply({ embeds: [errorEmbed('An error occurred while executing this command.')] });
      }
  }
};