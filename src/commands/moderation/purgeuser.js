const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purgeuser')
    .setDescription('Purge messages from a specific user')
    .addUserOption(option => option.setName('user').setDescription('The user whose messages to purge').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('Number of messages to check (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  cooldown: 5,
  aliases: ['pu'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const amount = isSlash ? interaction.options?.getInteger('amount') : parseInt(args?.[1]);

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    if (!amount || amount < 1 || amount > 100) return interaction.reply({ embeds: [errorEmbed('Please provide a number between 1 and 100.')] });

    try {
      const channel = interaction.channel;
      const messages = await channel.messages.fetch({ limit: 100 });
      const userMessages = messages.filter(m => m.author.id === target.id).first(amount);
      const deleted = await channel.bulkDelete(userMessages, true);

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'purgeuser',
        reason: `Purged ${deleted.size} messages from ${target.user.tag} in ${channel.name}`,
        case_number: caseNumber
      });

      return interaction.reply({ embeds: [successEmbed(`Successfully deleted ${deleted.size} messages from ${target.user.tag}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while purging messages.')] });
    }
  }
};
