const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber, getModLogsByUser } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnremove')
    .setDescription('Remove a specific warning from a user')
    .addUserOption(option => option.setName('user').setDescription('The user to remove warning from').setRequired(true))
    .addIntegerOption(option => option.setName('case').setDescription('The case number to remove').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for removing the warning'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  cooldown: 5,
  aliases: ['wr'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const caseNumber = isSlash ? interaction.options?.getInteger('case') : parseInt(args?.[1]);
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(2).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    if (!caseNumber) return interaction.reply({ embeds: [errorEmbed('Please provide a valid case number.')] });

    try {
      const logs = await getModLogsByUser(interaction.guild.id, target.id, 1000);
      const warning = logs.find(l => l.case_number === caseNumber && l.action === 'warn');

      if (!warning) return interaction.reply({ embeds: [errorEmbed(`Warning #${caseNumber} not found for this user.`)] });

      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'warnremove',
        reason: `Removed warning #${caseNumber}: ${reason}`,
        case_number: caseNumber
      });

      const guildConfig = await getGuild(interaction.guild.id);
      if (guildConfig?.mod_log_channel) {
        const logChannel = interaction.guild.channels.cache.get(guildConfig.mod_log_channel);
        if (logChannel) {
          logChannel.send({
            embeds: [successEmbed(`**Warning #${caseNumber}** removed from ${target.user.tag} by ${member.user.tag}\n**Reason:** ${reason}`)]
          });
        }
      }

      return interaction.reply({ embeds: [successEmbed(`Successfully removed warning #${caseNumber} from ${target.user.tag}.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while removing the warning.')] });
    }
  }
};
