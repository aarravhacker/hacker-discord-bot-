const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Show your or another user\'s XP')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to check').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['xp'],
  prefix: true,
  async execute(interaction, args) {
    const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first() || interaction.user;
    const guildId = interaction.guild?.id;

    try {
      const user = await getUser(target.id, guildId);
      if (!user) {
        return interaction.reply({ embeds: [errorEmbed('User not found in database.')] });
      }

      const xp = user.xp || 0;
      const level = user.level || 1;
      const xpNeeded = level * 1000;

      const embed = successEmbed(`${target.username}'s XP`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addField('Current XP', `${xp.toLocaleString()}`, true)
        .addField('XP to Next Level', `${(xpNeeded - xp).toLocaleString()}`, true)
        .addField('Total XP Needed', `${xpNeeded.toLocaleString()}`, true)
        .setColor(0x5865F2);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching XP.')] });
    }
  }
};
