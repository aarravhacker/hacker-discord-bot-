const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xbox')
    .setDescription('Fun Xbox-related command'),
  cooldown: 5,
  aliases: ['xb'],
  prefix: true,

  async execute(interaction, args) {
    const facts = [
      '🎮 The original Xbox was released on November 15, 2001.',
      ' Halo: Combat Evolved was the Xbox\'s launch title and a massive success.',
      ' Xbox Live launched in 2002 and revolutionized online console gaming.',
      ' The Xbox 360 introduced achievements to gaming.',
      ' Game Pass gives you access to hundreds of games for a monthly fee.',
      ' The Xbox Series X can run games at 120fps in 4K.',
      ' Master Chief is the iconic face of the Xbox franchise.',
      ' Bethesda was acquired by Microsoft in 2021 for $7.5 billion.',
    ];

    const fact = facts[Math.floor(Math.random() * facts.length)];

    const games = ['Halo', 'Forza', 'Gears of War', 'Fable', 'Starfield', 'Sea of Thieves', 'Forza Horizon'];
    const game = games[Math.floor(Math.random() * games.length)];

    const embed = new EmbedBuilder()
      .setColor('#107c10')
      .setTitle('Xbox Fun')
      .addFields(
        { name: 'Fun Fact', value: fact },
        { name: 'Random Game', value: game, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
