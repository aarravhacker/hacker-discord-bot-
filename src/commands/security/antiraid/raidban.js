const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidban')
    .setDescription('Ban all raid members')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption(opt =>
      opt.setName('role').setDescription('Verified role to keep')
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Ban reason')
    ),
  cooldown: 60,
  aliases: ['raban'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let verifiedRoleId;
      let reason;

      if (isSlash) {
        const role = interaction.options?.getRole('role');
        verifiedRoleId = role?.id;
        reason = interaction.options?.getString('reason') || 'Raid protection - banned';
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args[0]) {
          verifiedRoleId = args[0].replace(/[<@&>]/g, '');
        }
        reason = args.slice(1).join(' ') || 'Raid protection - banned';
      }

      let bannedCount = 0;
      const members = await guild.members.fetch();

      for (const [, member] of members) {
        if (member.user.bot) continue;
        if (member.id === moderator.id) continue;
        if (member.id === guild.ownerId) continue;
        if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) continue;

        try {
          await member.ban({ reason: `${reason} | Raid ban by ${moderator.tag}` });
          bannedCount++;
        } catch { }
      }

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'raid_ban',
        type: 'antiraid',
        details: JSON.stringify({ membersBanned: bannedCount, reason })
      });

      const embed = successEmbed('Raid Ban', `🔨 Banned **${bannedCount}** raid members.\n**Reason:** ${reason}`);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to ban raid members.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
