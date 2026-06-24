const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snapchat')
    .setDescription('Fun Snapchat-related command'),
  cooldown: 5,
  aliases: ['snap'],
  prefix: true,

  async execute(interaction, args) {
    const tips = [
      '📸 Did you know? Snapchat was originally called "Picaboo"!',
      '👻 The Ghost logo represents the fun, playful nature of the app.',
      ' yellow Snapchat logo is iconic — it\'s been the brand color since launch.',
      '💡 Tip: Use Snapchat filters to make your snaps more fun!',
      ' Snapchat lenses use AR technology to track your face in real-time.',
      '🏆 Snapchat has over 350 million daily active users worldwide.',
    ];

    const tip = tips[Math.floor(Math.random() * tips.length)];

    const embed = new EmbedBuilder()
      .setColor('#fffc00')
      .setTitle('Snapchat Fun')
      .setDescription(tip)
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
