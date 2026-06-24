const { SlashCommandBuilder } = require('discord.js');
const { getUser, updateUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('removexp')
    .setDescription('Remove XP from a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to remove XP from').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount of XP to remove').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['removexp'],
  prefix: true,
  async execute(interaction, args) {
    if (!interaction.member?.permissions?.has('MANAGE_GUILD')) {
      return interaction.reply({ embeds: [errorEmbed('You need Manage Server permission.')] });
    }

    const target = interaction.options?.getUser('user') || interaction.mentions?.users?.first();
    const amount = interaction.options?.getInteger('amount') || parseInt(args?.[1]);
    const guildId = interaction.guild?.id;

    if (!target) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    }

    if (!amount || amount <= 0) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid amount greater than 0.')] });
    }

    try {
      let user = await getUser(target.id, guildId);
      if (!user) {
        return interaction.reply({ embeds: [errorEmbed('User not found in database.')] });
      }

      const newXp = Math.max(0, (user.xp || 0) - amount);
      let newLevel = 1;
      let tempXp = newXp;
      while (tempXp >= newLevel * 1000) {
        tempXp -= newLevel * 1000;
        newLevel++;
      }

      await updateUser(target.id, guildId, { xp: newXp, level: newLevel });

      const embed = successEmbed('XP Removed')
        .setDescription(`Removed ${amount.toLocaleString()} XP from ${target.username}.`)
        .addField('New XP', `${newXp.toLocaleString()}`, true)
        .addField('New Level', `${newLevel}`, true)
        .setColor(0xFF0000);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while removing XP.')] });
    }
  }
};
