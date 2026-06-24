const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Show your or another user\'s rank')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to check').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['r'],
  prefix: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    let target;
    if (isSlash) {
      target = interaction.options?.getUser('user') || interaction.user;
    } else {
      target = interaction.mentions?.users?.first() || interaction.author;
    }
    const guildId = interaction.guild?.id;

    try {
      const user = await getUser(target.id, guildId);
      if (!user) {
        return interaction.reply({ embeds: [errorEmbed('User not found in database.')] });
      }

      const level = user.level || 1;
      const xp = user.xp || 0;
      const xpNeeded = level * 1000;
      const rank = user.rank || 'Unranked';

      const embed = successEmbed(`Rank for ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addField('Level', `${level}`, true)
        .addField('XP', `${xp.toLocaleString()}`, true)
        .addField('Rank', `${rank}`, true)
        .addField('XP to Next Level', `${(xpNeeded - xp).toLocaleString()}`, true)
        .setColor(0x5865F2);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching rank.')] });
    }
  }
};
