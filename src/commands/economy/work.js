const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const { getUser, updateUser } = require('../../db/userRepository');
const config = require('../../config');

const jobs = [
  { name: 'Software Developer', min: 200, max: 800, emoji: '💻' },
  { name: 'Chef', min: 100, max: 400, emoji: '👨‍🍳' },
  { name: 'Teacher', min: 150, max: 500, emoji: '👨‍🏫' },
  { name: 'Doctor', min: 300, max: 1000, emoji: '👨‍⚕️' },
  { name: 'Artist', min: 50, max: 600, emoji: '🎨' },
  { name: 'Mechanic', min: 100, max: 350, emoji: '🔧' },
  { name: 'Police Officer', min: 150, max: 450, emoji: '👮' },
  { name: 'Firefighter', min: 150, max: 400, emoji: '🧑‍🚒' },
  { name: 'Pilot', min: 400, max: 1200, emoji: '✈️' },
  { name: 'Musician', min: 80, max: 500, emoji: '🎵' }
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work to earn money'),
  cooldown: 60,
  aliases: ['job', 'career'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const user = isSlash ? interaction.user : interaction.author;
    try {
      const userData = await getUser(user.id, interaction.guild.id);
      const lastWork = userData.last_work || 0;
      const now = Date.now();
      const cooldown = 60000;

      if (now - lastWork < cooldown) {
        const remaining = Math.ceil((cooldown - (now - lastWork)) / 1000);
        return interaction.reply({ embeds: [errorEmbed(`You need to wait **${remaining}** seconds before working again.`)] });
      }

      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min;

      await updateUser(user.id, interaction.guild.id, {
        balance: (userData.balance || 0) + earned,
        last_work: now
      });

      const embed = new EmbedBuilder()
        .setColor(config.embedColors.economy || '#FFD700')
        .setTitle(`${job.emoji} Work`)
        .setDescription(`You worked as a **${job.name}** and earned **$${formatNumber(earned)}**!`)
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      await interaction.reply({ embeds: [errorEmbed('Failed to work.')] });
    }
  }
};
