const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { successEmbed, errorEmbed, warningEmbed } = require('../../../utils/helpers');
const { addSecurityLog } = require('../../../db/securityRepository');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuketimeout')
    .setDescription('Timeout a user detected by antinuke')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(opt =>
      opt.setName('user').setDescription('User to timeout').setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('duration').setDescription('Duration in minutes').setMinValue(1).setMaxValue(40320)
    )
    .addStringOption(opt =>
      opt.setName('reason').setDescription('Timeout reason')
    ),
  cooldown: 5,
  aliases: ['antimeout'],
  prefix: true,
  ownerOnly: true,
  async execute(interaction) {
    const isSlash = typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand();
    const guild = interaction.guild;
    const moderator = isSlash ? interaction.user : interaction.author;

    try {
      let targetUser;
      let duration = 10;
      let reason = 'Antinuke violation';

      if (isSlash) {
        targetUser = interaction.options?.getUser('user');
        duration = interaction.options?.getInteger('duration') || duration;
        reason = interaction.options?.getString('reason') || reason;
      } else {
        const args = interaction.content.split(' ').slice(1);
        if (args.length === 0) {
          return interaction.reply({ embeds: [warningEmbed('Warning', 'Please mention a user to timeout.')] });
        }
        const userId = args[0].replace(/[<@!>]/g, '');
        targetUser = await interaction.client.users.fetch(userId).catch(() => null);
        duration = parseInt(args[1]) || duration;
        reason = args.slice(2).join(' ') || reason;
        if (!targetUser) {
          return interaction.reply({ embeds: [errorEmbed('Error', 'User not found.')] });
        }
      }

      const member = await guild.members.fetch(targetUser.id).catch(() => null);
      if (!member) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'User is not in this server.')] });
      }

      if (!member.moderatable) {
        return interaction.reply({ embeds: [errorEmbed('Error', 'I cannot timeout this user. They may have a higher role.')] });
      }

      await member.timeout(duration * 60 * 1000, `${reason} | Timed out by ${moderator.tag} via antinuke`);

      await addSecurityLog({
        guild_id: guild.id,
        user_id: moderator.id,
        action: 'antinuke_timeout',
        type: 'antinuke',
        details: JSON.stringify({ target: targetUser.id, reason, duration })
      });

      const embed = successEmbed('Antinuke Timeout', `⏰ **${targetUser.tag}** has been timed out for ${duration} minutes.\n**Reason:** ${reason}`);

      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error(error);
      const embed = errorEmbed('Error', 'Failed to timeout user.');
      if (isSlash) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.reply({ embeds: [embed] });
      }
    }
  }
};
