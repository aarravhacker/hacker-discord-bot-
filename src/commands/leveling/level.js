const { SlashCommandBuilder } = require('discord.js');
const { getUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Show your or another user\'s level')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to check').setRequired(false)
    ),
  cooldown: 5,
  aliases: ['lvl'],
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

      const embed = successEmbed(`${target.username}'s Level`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true }))
        .addField('Current Level', `${level}`, true)
        .setColor(0x5865F2);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while fetching level.')] });
    }
  }
};
