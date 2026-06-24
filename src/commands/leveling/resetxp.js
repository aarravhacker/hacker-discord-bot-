const { SlashCommandBuilder } = require('discord.js');
const { updateUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resetxp')
    .setDescription('Reset a user\'s XP and level')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to reset').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['resetxp'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first();
    const guildId = interaction.guild?.id;

    if (!target) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    }

    try {
      await updateUser(target.id, guildId, { xp: 0, level: 1 });

      const embed = successEmbed('XP Reset')
        .setDescription(`${target.username}'s XP and level have been reset to 0 and 1.`)
        .setColor(0xFF0000);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while resetting XP.')] });
    }
  }
};
