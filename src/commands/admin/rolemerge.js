const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rolemerge')
    .setDescription('Merge one role into another (add source role members to target, then delete source)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('source').setDescription('Source role to merge from').setRequired(true))
    .addRoleOption(opt => opt.setName('target').setDescription('Target role to merge into').setRequired(true))
    .addBooleanOption(opt => opt.setName('delete').setDescription('Delete the source role after merging')),
  cooldown: 120,
  aliases: ['mergerole'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const source = interaction.options?.getRole('source') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
    const target = interaction.options?.getRole('target') || interaction.guild.roles.cache.get(args?.[1]?.replace(/[<@&>]/g, ''));
    const deleteSource = interaction.options?.getBoolean('delete') ?? (args?.[2] !== 'false');

    if (!source || !target) return interaction.reply({ embeds: [errorEmbed('Please provide both source and target roles.')] });
    if (source.id === target.id) return interaction.reply({ embeds: [errorEmbed('Source and target roles must be different.')] });

    if (isSlash) {
      await interaction.deferReply();
    } else {
      await interaction.channel.sendTyping();
    }

    const members = interaction.guild.members.cache.filter(m => m.roles.cache.has(source.id) && !m.roles.cache.has(target.id));
    let success = 0;
    let failed = 0;

    for (const [, member] of members) {
      try {
        await member.roles.add(target, `Role merge by ${user.tag}`);
        success++;
      } catch {
        failed++;
      }
    }

    let result = `Merged **${formatNumber(success)}** members from ${source} into ${target}`;
    if (failed > 0) result += ` (${failed} failed)`;

    if (deleteSource) {
      try {
        await source.delete(`Role merge by ${user.tag}`);
        result += `\nDeleted source role ${source}`;
      } catch (err) {
        result += `\nFailed to delete source role: ${err.message}`;
      }
    }

    if (isSlash) {
      await interaction.editReply({ embeds: [successEmbed(result)] });
    } else {
      await interaction.reply({ embeds: [successEmbed(result)] });
    }
  }
};
