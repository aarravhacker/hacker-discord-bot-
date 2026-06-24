const { SlashCommandBuilder } = require('discord.js');
const { getUser, updateUser } = require('../../db/userRepository');
const { successEmbed, errorEmbed } = require('../../utils/helpers');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addxp')
    .setDescription('Add XP to a user')
    .addUserOption(option =>
      option.setName('user').setDescription('The user to add XP to').setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName('amount').setDescription('Amount of XP to add').setRequired(true)
    ),
  cooldown: 5,
  aliases: ['addxp'],
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
        user = { user_id: target.id, guild_id: guildId, xp: 0, level: 1 };
      }

      const newXp = (user.xp || 0) + amount;
      let newLevel = user.level || 1;

      while (newXp >= newLevel * 1000) {
        newLevel++;
      }

      await updateUser(target.id, guildId, { xp: newXp, level: newLevel });

      const embed = successEmbed('XP Added')
        .setDescription(`Added ${amount.toLocaleString()} XP to ${target.username}.`)
        .addField('New XP', `${newXp.toLocaleString()}`, true)
        .addField('New Level', `${newLevel}`, true)
        .setColor(0x00FF00);

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      return interaction.reply({ embeds: [errorEmbed('An error occurred while adding XP.')] });
    }
  }
};
