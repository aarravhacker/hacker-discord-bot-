const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');
const { hasPermission, isChannelLocked, checkAll, EMOJI } = require('../../utils/smartCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to unlock'))
    .addStringOption(option => option.setName('reason').setDescription('Reason for unlocking'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 5,
  aliases: ['ul'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const channel = isSlash ? interaction.options?.getChannel('channel') : null;
    const targetChannel = channel || interaction.channel;
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    const { ok, issues } = checkAll(member, null, interaction.guild, 'unlock');

    if (!isChannelLocked(targetChannel, interaction.guild.id)) {
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.warn} Channel Not Locked`)
        .setDescription(`<#${targetChannel.id}> is **not locked**. Nothing to do.`)
        .setColor(0xffaa00)
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (!ok) {
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.no} Cannot Unlock Channel`)
        .setDescription('Pre-checks failed:')
        .setColor(0xff0000)
        .addFields({ name: 'Issues', value: issues.map(i => `\`${i}\``).join('\n') })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: null
      }, reason);

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'channel',
        moderator_id: member.id,
        action: 'unlock',
        reason: `Unlocked ${targetChannel.name}: ${reason}`,
        case_number: caseNumber
      });

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.unlock} Channel Unlocked`)
        .setDescription(`<#${targetChannel.id}> has been unlocked.`)
        .setColor(0x00ff00)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: `<@${member.id}>` }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Failed to unlock channel', err.message)] });
    }
  }
};
