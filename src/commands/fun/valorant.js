const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('valorant')
    .setDescription('Fun Valorant-related command'),
  cooldown: 5,
  aliases: ['val'],
  prefix: true,

  async execute(interaction, args) {
    const facts = [
      '🎯 Jett is the most popular agent in competitive play!',
      ' Valorant was released on June 2, 2020.',
      ' The Vandal and Phantom are the two most used rifles.',
      ' Spike takes 40 seconds to detonate.',
      ' Ace is the hardest achievement — 5 kills with the Spike.',
      ' Red Bull partnered with Valorant for major esports events.',
      ' Neon is the fastest agent in the game.',
      ' Bind is one of the original maps released at launch.',
    ];

    const fact = facts[Math.floor(Math.random() * facts.length)];

    const agents = ['Jett', 'Phoenix', 'Sage', 'Omen', 'Raze', 'Breach', 'Cypher', 'Sova', 'Viper', 'Reyna'];
    const agent = agents[Math.floor(Math.random() * agents.length)];

    const embed = new EmbedBuilder()
      .setColor('#ff4655')
      .setTitle('Valorant Fun')
      .addFields(
        { name: 'Fun Fact', value: fact },
        { name: 'Random Agent', value: agent, inline: true }
      )
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};
