const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinukeban')
    .setDescription('Ban a user detected by antinuke')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to ban').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Ban reason')
    ),
  cooldown: 5,
  aliases: ['anban'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let targetUser;
      let reason = 'Antinuke violation';

      if (isSlash) {
        targetUser = interaction.options?.getUser('user');
        reason = interaction.options?.getString('reason') || reason;
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please mention a user to ban.')] });
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

      if (!member.bannable) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'I cannot ban this user. They may have a higher role.')] });
      }

      await member.ban({ reason: `${reason} | Banned by ${moderator.tag} via antinuke` });

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'antinuke_ban',
        type: 'antinuke',
        details: JSON.stringify({ target: targetUser.id, reason })
      });

      const embed = successEmbed('Antinuke Ban', `🔨 **${targetUser.tag}** has been banned.\n**Reason:** ${reason}`);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to ban user.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
