const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vcdisconnect')
    .setDescription('Disconnect a member from voice channel')
    .addUserOption(option => option.setName('user').setDescription('The user to disconnect').setRequired(true))
    .addStringOption(option => option.setName('reason').setDescription('Reason for the disconnect'))
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),
  cooldown: 5,
  aliases: ['dc', 'vcdisconnect'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const target = isSlash ? interaction.options?.getMember('user') : interaction.guild.members.cache.get(args?.[0]?.replace(/[<>@!]/g, ''));
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    if (!target) return interaction.reply({ embeds: [errorEmbed('Please provide a valid user.')] });
    if (!target.voice.channel) return interaction.reply({ embeds: [errorEmbed('This user is not in a voice channel.')] });

    try {
      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: target.id,
        moderator_id: member.id,
        action: 'disconnect',
        reason,
        case_number: caseNumber
      });

      await target.voice.disconnect(reason);

      return interaction.reply({ embeds: [successEmbed(`Successfully disconnected ${target.user.tag} from voice.`)] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('An error occurred while disconnecting the user.')] });
    }
  }
};
