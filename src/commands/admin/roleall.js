const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, formatNumber } = require('../../utils/helpers');
const config = require('../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleall')
    .setDescription('Add a role to all members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true)),
  cooldown: 60,
  aliases: ['giveroleall', 'massrole'],
  prefix: true,
  adminOnly: true,
  async execute(interaction, args) {
    const isSlash = interaction.isChatInputCommand?.() || false;
    const user = isSlash ? interaction.user : interaction.author;
    const role = interaction.options?.getRole('role') || interaction.guild.roles.cache.get(args?.[0]?.replace(/[<@&>]/g, ''));
    if (!role) return interaction.reply({ embeds: [errorEmbed('Please provide a valid role.')] });

    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({ embeds: [errorEmbed('Cannot assign a role equal to or higher than my highest role.')] });
    }

    if (isSlash) {
      await interaction.deferReply();
    } else {
      await interaction.channel.sendTyping();
    }

    const members = await interaction.guild.members.fetch();
    let success = 0;
    let failed = 0;

    const batch = members.filter(m => !m.user.bot && !m.roles.cache.has(role.id));

    for (const [, member] of batch) {
      try {
        await member.roles.add(role, `Mass role by ${user.tag}`);
        success++;
      } catch {
        failed++;
      }
    }

    const resultEmbed = successEmbed(`Added ${role} to **${formatNumber(success)}** members (${failed} failed)`);
    if (isSlash) {
      await interaction.editReply({ embeds: [resultEmbed] });
    } else {
      await interaction.reply({ embeds: [resultEmbed] });
    }
  }
};
