const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('progress')
    .setDescription('Show your level progress bar')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to check').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['progress'],
  prefix: true,
  async execute(interaction, args) {
    const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first() || interaction.user;
    const guildId = interaction.guild?.id;

    try {
      const user = await getUser(target.id, guildId);
      if (!user) {
        return interaction.reply({ embeds: [errorEmbed('User not found in database.')] });
      }

      const level = user.level || 1;
      const xp = user.xp || 0;
      const xpNeeded = level * 1000;
      const progress = Math.floor((xp / xpNeeded) * 20);
      const empty = 20 - progress;

      const progressBar = '█'.repeat(progress) + '░'.repeat(empty);
      const percentage = Math.floor((xp / xpNeeded) * 100);

      const embed = successEmbed(`${target.username}'s Progress`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .setDescription(`Level ${level} → ${level + 1}`)
        .addField('Progress', `\`\`\`${progressBar}\`\`\``)
        .addField('Percentage', `${percentage}% (${xp.toLocaleString()} / ${xpNeeded.toLocaleString()} XP)`, true)
        .setColor(config.embedColors?.primary || 0x5865F2);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching progress.')] });
    }
  }
};
