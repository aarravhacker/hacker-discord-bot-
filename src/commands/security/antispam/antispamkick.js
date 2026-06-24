const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antispamkick')
    .setDescription('Kick a user for spamming')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to kick').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Kick reason')
    ),
  cooldown: 5,
  aliases: ['askick'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let targetUser;
      let reason = 'Spamming';

      if (isSlash) {
        targetUser = interaction.options?.getUser('user');
        reason = interaction.options?.getString('reason') || reason;
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please mention a user to kick.')] });
        }
        const userId = args[0].replace(/[<@!>]/g, '');
        targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        reason = args.slice(1).join(' ') || reason;
        if (!targetUser) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'User not found.')] });
        }
      }

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'User is not in this server.')] });
      }

      if (!member.kickable) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'I cannot kick this user. They may have a higher role.')] });
      }

      await member.kick(`${reason} | Kicked by ${moderator.tag} via antispam`);

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'antispam_kick',
        type: 'antispam',
        details: JSON.stringify({ target: targetUser.id, reason })
      });

      const embed = successEmbed(
        'Antispam Kick',
        `👢 **${targetUser.tag}** has been kicked.\n**Reason:** ${reason}`
      );

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to kick user for spamming.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
