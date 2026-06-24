const { SlashCommandBuilder } = require('discord.js');
const { getUser, updateUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setxp')
    .setDescription('Set a user\'s XP to a specific amount')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to set XP for').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount of XP to set').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['setxp'],
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

    if (amount === undefined || amount < 0) {
      return interaction.reply({ embeds: [errorEmbed('Please provide a valid amount (0 or greater).')] });
    }

    try {
      let user = await getUser(target.id, guildId);
      if (!user) {
        user = { user_id: target.id, guild_id: guildId, xp: 0, level: 1 };
      }

      let newLevel = 1;
      let tempXp = amount;
      while (tempXp >= newLevel * 1000) {
        tempXp -= newLevel * 1000;
        newLevel++;
      }

      await updateUser(target.id, guildId, { xp: amount, level: newLevel });

      const embed = successEmbed('XP Set')
        .setDescription(`Set ${target.username}'s XP to ${amount.toLocaleString()}.`)
        .addField('New XP', `${amount.toLocaleString()}`, true)
        .addField('New Level', `${newLevel}`, true)
        .setColor(0x5865F2);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while setting XP.')] });
    }
  }
};
