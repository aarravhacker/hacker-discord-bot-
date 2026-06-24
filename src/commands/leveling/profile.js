const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Show your or another user\'s profile')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to check').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['profile', 'me'],
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
      const totalXp = user.total_xp || xp;
      const messages = user.messages || 0;
      const rank = user.rank || 'Unranked';

      const embed = successEmbed(`${target.username}'s Profile`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addField('Level', `${level}`, true)
        .addField('XP', `${formatNumber(xp)}`, true)
        .addField('Rank', `${rank}`, true)
        .addField('Total XP', `${formatNumber(totalXp)}`, true)
        .addField('Messages', `${formatNumber(messages)}`, true)
        .addField('XP to Next Level', `${formatNumber(xpNeeded - xp)}`, true)
        .setColor(0x5865F2);

      if (user.badges && user.badges.length > 0) {
        embed.addField('Badges', user.badges.join(' '));
      }

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching profile.')] });
    }
  }
};
