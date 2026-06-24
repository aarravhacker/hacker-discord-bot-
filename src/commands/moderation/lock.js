const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { successEmbed, errorEmbed } = require('../../utils/helpers');
const { addModLog, getCaseNumber } = require('../../db/modRepository');
const { getGuild } = require('../../db/guildRepository');
const { hasPermission, isChannelLocked, checkAll, EMOJI } = require('../../utils/smartCheck');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel')
    .addChannelOption(option => option.setName('channel').setDescription('The channel to lock'))
    .addStringOption(option => option.setName('reason').setDescription('Reason for locking'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
  cooldown: 5,
  aliases: ['l'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const member = isSlash ? interaction.member : interaction.guild.members.cache.get(interaction.author?.id);
    const channel = isSlash ? interaction.options?.getChannel('channel') : null;
    const targetChannel = channel || interaction.channel;
    const reason = isSlash ? interaction.options?.getString('reason') : (args?.slice(1).join(' ') || 'No reason provided');

    const { ok, issues, info } = checkAll(member, null, interaction.guild, 'lock');

    if (isChannelLocked(targetChannel, interaction.guild.id)) {
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.warn} Channel Already Locked`)
        .setDescription(`<#${targetChannel.id}> is **already locked**.`)
        .setColor(0xffaa00)
        .addFields(
          { name: 'Current Overwrite', value: `\`${JSON.stringify(targetChannel.permissionOverwrites.cache.get(interaction.guild.id)?.deny?.toJSON() || [])}\`` }
        )
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    if (!ok) {
      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.no} Cannot Lock Channel`)
        .setDescription('Pre-checks failed:')
        .setColor(0xff0000)
        .addFields({ name: 'Issues', value: issues.map(i => `\`${i}\``).join('\n') })
        .setTimestamp();
      return interaction.reply({ embeds: [embed] });
    }

    try {
      await targetChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      }, reason);

      const caseNumber = await getCaseNumber(interaction.guild.id);
      await addModLog({
        guild_id: interaction.guild.id,
        user_id: 'channel',
        moderator_id: member.id,
        action: 'lock',
        reason: `Locked ${targetChannel.name}: ${reason}`,
        case_number: caseNumber
      });

      const embed = new EmbedBuilder()
        .setTitle(`${EMOJI.lock} Channel Locked`)
        .setDescription(`<#${targetChannel.id}> has been locked.`)
        .setColor(0x00ff00)
        .addFields(
          { name: 'Reason', value: reason },
          { name: 'Moderator', value: `<@${member.id}>` }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error(err);
      return interaction.reply({ embeds: [errorEmbed('Failed to lock channel', err.message)] });
    }
  }
};
